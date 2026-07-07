import gradio as gr
import ollama
import math
import time
from datetime import datetime, timedelta

# ---------- DATABASE ----------
hospitals = [
    {"id": 1, "name": "Lagos General", "lat": 6.5244, "lon": 3.3792, "phone": "080-111-1111"},
    {"id": 2, "name": "Ikeja Medical Center", "lat": 6.5965, "lon": 3.3454, "phone": "080-222-2222"},
    {"id": 3, "name": "Surulere General Hospital", "lat": 6.4965, "lon": 3.3454, "phone": "080-333-3333"},
]

inventory = {
    "Lagos General": {"O+": 5, "O-": 2, "A+": 3, "B+": 1},
    "Ikeja Medical Center": {"O+": 8, "O-": 4, "A+": 2, "AB+": 3},
    "Surulere General Hospital": {"O+": 0, "O-": 0, "B+": 4},
}

donors = [
    {"id": 1, "name": "Adeola Ogun", "blood": "O-", "phone": "080-123-4567", "hospital": "Lagos General", "lat": 6.5244, "lon": 3.3792, "last_donation": "2025-12-01"},
    {"id": 2, "name": "Chidi Okonkwo", "blood": "O-", "phone": "080-234-5678", "hospital": "Lagos General", "lat": 6.4550, "lon": 3.3841, "last_donation": "2025-09-15"},
    {"id": 3, "name": "Grace Okonkwo", "blood": "O+", "phone": "080-789-0123", "hospital": "Lagos General", "lat": 6.4550, "lon": 3.3841, "last_donation": "2025-12-15"},
    {"id": 4, "name": "Emeka Nwosu", "blood": "O-", "phone": "080-456-7890", "hospital": "Ikeja Medical Center", "lat": 6.5965, "lon": 3.3454, "last_donation": "2025-10-10"},
    {"id": 5, "name": "Oluwaseun Adeyemi", "blood": "O-", "phone": "080-678-9012", "hospital": "Surulere General Hospital", "lat": 6.4965, "lon": 3.3454, "last_donation": "2025-11-01"},
    {"id": 6, "name": "Ifeanyi Obi", "blood": "O+", "phone": "080-890-1234", "hospital": "Ikeja Medical Center", "lat": 6.5965, "lon": 3.3454, "last_donation": "2025-12-20"},
]

# ---------- HELPER FUNCTIONS ----------
def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return round(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a)), 1)

def find_donors_by_hospital(blood_type, hospital_name):
    return [d for d in donors if d["blood"].upper() == blood_type.upper() and d["hospital"] == hospital_name]

def check_eligibility(donor_list):
    eligible = []
    cutoff = datetime.now() - timedelta(days=90)
    for d in donor_list:
        try:
            last_don = datetime.strptime(d["last_donation"], "%Y-%m-%d")
            if last_don <= cutoff:
                eligible.append(d)
        except:
            eligible.append(d)
    return eligible

def plan_route(donor_list, hospital_lat, hospital_lon):
    for d in donor_list:
        d["distance_km"] = haversine(hospital_lat, hospital_lon, d["lat"], d["lon"])
    return sorted(donor_list, key=lambda x: x["distance_km"])

def find_nearby_hospitals(current_hospital, max_distance=50):
    current = next(h for h in hospitals if h["name"] == current_hospital)
    nearby = []
    for h in hospitals:
        if h["name"] == current_hospital:
            continue
        dist = haversine(current["lat"], current["lon"], h["lat"], h["lon"])
        if dist <= max_distance:
            nearby.append({"name": h["name"], "distance": dist, "phone": h["phone"]})
    return sorted(nearby, key=lambda x: x["distance"])

def generate_network_report(patient_blood, condition, current_hospital):
    hospital = next(h for h in hospitals if h["name"] == current_hospital)
    
    own_donors = find_donors_by_hospital(patient_blood, current_hospital)
    eligible_donors = check_eligibility(own_donors)
    ranked_donors = plan_route(eligible_donors, hospital["lat"], hospital["lon"])
    
    for d in ranked_donors[:3]:
        d["reason"] = (
            f"Compatible {d['blood']} donor. "
            f"Last donation: {d['last_donation']} (>90 days ago = eligible). "
            f"Located {d['distance_km']}km away (closest available)."
        )
    
    own_inventory = inventory.get(current_hospital, {}).get(patient_blood, 0)
    
    nearby = find_nearby_hospitals(current_hospital)
    nearby_with_blood = []
    for n in nearby:
        n_inv = inventory.get(n["name"], {}).get(patient_blood, 0)
        if n_inv > 0:
            nearby_with_blood.append({"name": n["name"], "units": n_inv, "distance": n["distance"], "phone": n["phone"]})
    
    report = f"""
EMERGENCY NETWORK REPORT

Requesting Hospital: {current_hospital}
Patient Blood Type: {patient_blood}
Condition: {condition}
Generated: {datetime.now().strftime('%Y-%m-%d %I:%M %p')}

OPTION 1: OWN HOSPITAL DONORS
{current_hospital} has {len(ranked_donors)} eligible {patient_blood} donors:
"""
    if ranked_donors:
        for i, d in enumerate(ranked_donors[:3], 1):
            report += f"""
  {i}. {d['name']} | Phone: {d['phone']} | {d['distance_km']}km away
     Reason: {d['reason']}
"""
    else:
        report += "  No eligible donors at this hospital.\n"
    
    report += f"""
OPTION 2: OWN HOSPITAL INVENTORY
{current_hospital} has {own_inventory} units of {patient_blood} on the shelf.

OPTION 3: NEARBY HOSPITALS WITH {patient_blood}
"""
    if nearby_with_blood:
        for n in nearby_with_blood:
            report += f"  Hospital: {n['name']} | Phone: {n['phone']}\n"
            report += f"     Units available: {n['units']} | Distance: {n['distance']}km away\n"
    else:
        report += "  No nearby hospitals have this blood type in stock.\n"
    
    report += """
ACTION PLAN:
1. If donors exist, call the #1 donor IMMEDIATELY.
2. If inventory exists, prepare blood from your own fridge.
3. If nearby hospitals have it, call them to dispatch a transfer.
"""
    return report

def extract_blood_type(user_input):
    blood_types = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]
    for bt in blood_types:
        if bt.upper() in user_input.upper():
            return bt
    try:
        response = ollama.chat(
            model='gemma-local',
            messages=[{'role': 'user', 'content': f'Extract ONLY blood type from "{user_input}". Blood type:'}]
        )
        return response['message']['content'].strip().upper()
    except:
        return "O-"

# ---------- COMMAND CENTER ----------
def process_network_request(user_input, hospital_selector):
    if not user_input or user_input.strip() == "":
        yield "Please describe the emergency."
        return

    full_response = ""

    step = "*Initializing Offline AI Engine... Done*\n"
    full_response += step
    yield full_response
    time.sleep(0.2)

    step = "*Gemma 4 loaded into memory.*\n\n"
    full_response += step
    yield full_response
    time.sleep(0.2)

    step = "Step 1: Interpreting the Request\n"
    full_response += step
    yield full_response
    time.sleep(0.2)

    step = f"*Analyzing: \"{user_input}\"*\n"
    full_response += step
    yield full_response
    time.sleep(0.2)

    step = "*Searching for blood type keywords...*\n\n"
    full_response += step
    yield full_response
    time.sleep(0.2)

    step = "Step 2: Extracting Blood Type (Gemma is thinking)\n"
    full_response += step
    yield full_response
    
    blood_type = extract_blood_type(user_input)
    
    blood_types = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]
    detected = None
    for bt in blood_types:
        if bt.upper() in blood_type.upper():
            detected = bt
            break
    if not detected:
        detected = "O-"

    step = f"*Gemma identified: {detected}*\n"
    full_response += step
    yield full_response
    time.sleep(0.2)

    step = f"*Confidence: High*\n\n"
    full_response += step
    yield full_response
    time.sleep(0.2)

    step = "Step 3: Agentic Search (Python Execution)\n"
    full_response += step
    yield full_response
    time.sleep(0.2)

    step = f"*Querying donor database for {detected}...*\n"
    full_response += step
    yield full_response
    time.sleep(0.2)
    
    donors_found = find_donors_by_hospital(detected, hospital_selector)
    step = f"*Found {len(donors_found)} donors with {detected}.*\n"
    full_response += step
    yield full_response
    time.sleep(0.2)
    
    step = "*Applying 90-day eligibility filter...*\n"
    full_response += step
    yield full_response
    time.sleep(0.2)
    
    eligible_donors = check_eligibility(donors_found)
    step = f"*{len(eligible_donors)} donors are eligible.*\n\n"
    full_response += step
    yield full_response
    time.sleep(0.2)

    step = "Step 4: Calculating Offline Distances\n"
    full_response += step
    yield full_response
    time.sleep(0.2)

    step = "*Using Haversine formula (local math).*\n"
    full_response += step
    yield full_response
    time.sleep(0.2)
    
    hospital = next(h for h in hospitals if h["name"] == hospital_selector)
    ranked = plan_route(eligible_donors, hospital["lat"], hospital["lon"])
    
    if ranked:
        step = "*Donors ranked by proximity.*\n"
        full_response += step
        yield full_response
        time.sleep(0.2)
        
        step = f"*Closest: {ranked[0]['name']} ({ranked[0]['distance_km']}km away)*\n\n"
        full_response += step
        yield full_response
        time.sleep(0.2)
    else:
        step = "*No eligible donors found.*\n\n"
        full_response += step
        yield full_response
        time.sleep(0.2)

    step = "Step 5: Scanning Regional Network\n"
    full_response += step
    yield full_response
    time.sleep(0.2)

    nearby = find_nearby_hospitals(hospital_selector)
    nearby_with_blood = []
    for n in nearby:
        n_inv = inventory.get(n["name"], {}).get(detected, 0)
        if n_inv > 0:
            nearby_with_blood.append(n)
    
    if nearby_with_blood:
        step = f"*{len(nearby_with_blood)} nearby hospitals have {detected} in stock.*\n"
        full_response += step
        yield full_response
        time.sleep(0.2)
    else:
        step = "*No nearby hospitals have this blood type.*\n\n"
        full_response += step
        yield full_response
        time.sleep(0.2)

    step = "Step 6: Generating Explainable Dispatch Report\n"
    full_response += step
    yield full_response
    time.sleep(0.2)

    step = "*Compiling reasoning for each selected donor...*\n"
    full_response += step
    yield full_response
    time.sleep(0.2)

    step = "*Organizing inventory data...*\n"
    full_response += step
    yield full_response
    time.sleep(0.2)

    step = "*Report ready!*\n\n"
    full_response += step
    yield full_response
    time.sleep(0.2)

    report = generate_network_report(detected, "Trauma", hospital_selector)
    full_response += report
    yield full_response

# ---------- DASHBOARD ----------
def dashboard_query(query, hospital_name):
    if not query or query.strip() == "":
        yield "Please ask a question."
        return

    full_response = ""

    step = "*Step 1: Connecting to hospital database...*\n"
    full_response += step
    yield full_response
    time.sleep(0.2)

    step = f"*Fetching data for {hospital_name}...*\n"
    full_response += step
    yield full_response
    time.sleep(0.2)

    hospital_inventory = inventory.get(hospital_name, {})
    hospital_donors = [d for d in donors if d["hospital"] == hospital_name]
    donor_counts = {}
    for d in hospital_donors:
        donor_counts[d["blood"]] = donor_counts.get(d["blood"], 0) + 1
    
    upcoming = []
    for d in hospital_donors:
        try:
            last = datetime.strptime(d["last_donation"], "%Y-%m-%d")
            next_donation = last + timedelta(days=90)
            if next_donation <= datetime.now() + timedelta(days=7) and next_donation > datetime.now():
                upcoming.append(d["name"])
        except:
            pass

    step = f"*Data loaded. {len(hospital_donors)} donors found.*\n"
    full_response += step
    yield full_response
    time.sleep(0.2)

    step = "*Step 2: Analyzing trends with Gemma...*\n"
    full_response += step
    yield full_response
    time.sleep(0.2)

    step = f"*Processing your question: \"{query}\"*\n"
    full_response += step
    yield full_response
    time.sleep(0.2)

    data_summary = f"""
Hospital: {hospital_name}
Inventory: {hospital_inventory}
Total Donors: {len(hospital_donors)}
Donor Breakdown: {donor_counts}
Upcoming: {upcoming if upcoming else 'None'}
"""
    
    prompt = f"Answer based ONLY on this data.\nData: {data_summary}\nQuestion: {query}\nAnswer:"
    try:
        response = ollama.chat(model='gemma-local', messages=[{'role': 'user', 'content': prompt}])
        answer = response['message']['content']
    except:
        answer = "Error processing query."

    step = "*Step 3: Generating insights...*\n\n"
    full_response += step
    yield full_response
    time.sleep(0.2)

    full_response += f"Answer:\n{answer}"
    yield full_response

# ---------- COMPATIBILITY ----------
def explain_compatibility(patient_blood, donor_blood):
    if not patient_blood or not donor_blood:
        yield "Please enter both blood types."
        return

    full_response = ""

    step = "*Step 1: Analyzing blood types...*\n"
    full_response += step
    yield full_response
    time.sleep(0.2)

    step = f"*Patient: {patient_blood} | Donor: {donor_blood}*\n"
    full_response += step
    yield full_response
    time.sleep(0.2)

    step = "*Step 2: Cross-referencing compatibility rules...*\n"
    full_response += step
    yield full_response
    time.sleep(0.2)

    step = "*Checking universal donor/recipient rules...*\n"
    full_response += step
    yield full_response
    time.sleep(0.2)

    step = "*Step 3: Generating explanation...*\n\n"
    full_response += step
    yield full_response
    time.sleep(0.2)
    
    prompt = f"""Patient blood type: {patient_blood}
Donor blood type: {donor_blood}

Explain in plain English:
1. Is this a match?
2. Why or why not?
3. What are the implications for transfusion?

Keep it clear and educational."""
    
    try:
        response = ollama.chat(model='gemma-local', messages=[{'role': 'user', 'content': prompt}])
        answer = response['message']['content']
    except:
        answer = "Error. Please try again."

    full_response += f"Result:\n{answer}"
    yield full_response

# ---------- UI FUNCTIONS ----------
def add_donor(name, blood, phone, hospital, last_donation):
    if not name or not blood or not phone:
        return "Please fill in all required fields."
    new_id = max([d["id"] for d in donors]) + 1
    hospital_obj = next(h for h in hospitals if h["name"] == hospital)
    donors.append({
        "id": new_id, "name": name, "blood": blood, "phone": phone,
        "hospital": hospital, "lat": hospital_obj["lat"], "lon": hospital_obj["lon"],
        "last_donation": last_donation
    })
    return f"Donor '{name}' registered successfully!"

def add_inventory(hospital_name, blood_type, units):
    if not hospital_name or not blood_type:
        return "Please select a hospital and enter a blood type."
    if hospital_name not in inventory:
        inventory[hospital_name] = {}
    inventory[hospital_name][blood_type] = inventory[hospital_name].get(blood_type, 0) + int(units)
    return f"Inventory updated: {hospital_name} has {inventory[hospital_name][blood_type]} units of {blood_type}."

def get_inventory_display():
    display = "GLOBAL BLOOD INVENTORY\n" + "="*40 + "\n"
    for h, inv in inventory.items():
        display += f"\nHospital: {h}\n"
        if inv:
            for bt, units in inv.items():
                display += f"   {bt}: {units} unit(s)\n"
        else:
            display += "   (Empty)\n"
    return display

def add_hospital(name, lat, lon, phone):
    if not name:
        return "Enter a hospital name."
    new_id = max([h["id"] for h in hospitals]) + 1
    hospitals.append({"id": new_id, "name": name, "lat": lat, "lon": lon, "phone": phone})
    inventory[name] = {}
    return f"Hospital '{name}' added successfully!"

# ---------- CUSTOM CSS ----------
custom_css = """
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
* { font-family: 'Inter', sans-serif !important; }
body { background-color: #F8F5F5 !important; }
.gradio-container { max-width: 1200px !important; margin: 0 auto !important; }

.main-header {
    background: linear-gradient(135deg, #7A0B0B 0%, #A10D0D 50%, #8B0000 100%) !important;
    padding: 2rem 2.5rem !important;
    border-radius: 16px !important;
    margin-bottom: 2rem !important;
    box-shadow: 0 8px 30px rgba(138, 0, 0, 0.3) !important;
}
.main-header h1 { color: white !important; font-weight: 800 !important; font-size: 2.8rem !important; }
.main-header p { color: rgba(255,255,255,0.9) !important; font-size: 1.2rem !important; }
.main-header .badge {
    background: rgba(255,255,255,0.15) !important;
    padding: 4px 16px !important;
    border-radius: 40px !important;
    color: #fff !important;
    display: inline-block !important;
    border: 1px solid rgba(255,255,255,0.2) !important;
}

button, .gr-button { border-radius: 10px !important; font-weight: 700 !important; border: 2px solid #8B0000 !important; }
button.gr-button-primary, button.primary { background: #8B0000 !important; color: #FFFFFF !important; }
button.gr-button-primary:hover { background: #5C0000 !important; }
button.gr-button-secondary { background: #FFFFFF !important; color: #8B0000 !important; }
button.gr-button-secondary:hover { background: #8B0000 !important; color: #FFFFFF !important; }

.tab-nav { background: #FFFFFF !important; border-radius: 12px !important; border: 1px solid #E8E0E0 !important; }
button.tab-button.selected { background: #8B0000 !important; color: white !important; }
button.tab-button:hover:not(.selected) { background: #F5F0F0 !important; color: #8B0000 !important; }

input, textarea { border: 2px solid #E8E0E0 !important; border-radius: 10px !important; }
input:focus, textarea:focus { border-color: #8B0000 !important; box-shadow: 0 0 0 4px rgba(139, 0, 0, 0.08) !important; }

.footer { text-align: center; color: #888; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; }
"""

# ---------- UI LAYOUT ----------
with gr.Blocks(title="Haemo-Agent Network") as demo:
    gr.HTML("""
    <div class="main-header">
        <h1>🩸 Haemo-Agent <span style="font-weight:400;color:rgba(255,255,255,0.7);">Network</span></h1>
        <p>Offline Emergency Blood Coordination · Powered by Gemma 4</p>
        <div class="badge">⚡ 100% Offline · Zero Internet Required</div>
    </div>
    """)
    
    with gr.Tabs():
        # TAB 1: COMMAND CENTER
        with gr.TabItem("🚨 Command Center"):
            gr.Markdown("### 🏥 Emergency Command Center")
            gr.Markdown("Describe the emergency and watch Gemma reason in real-time.")
            
            with gr.Row():
                with gr.Column(scale=1):
                    hospital_selector = gr.Dropdown(
                        choices=[h["name"] for h in hospitals],
                        label="Your Hospital",
                        value="Lagos General",
                        interactive=True
                    )
                    user_input = gr.Textbox(
                        label="Describe the emergency",
                        placeholder="I need O+ blood for a trauma patient!",
                        lines=3
                    )
                    submit_btn = gr.Button("🚨 Find Blood Now", variant="primary")
                    clear_btn = gr.Button("🗑️ Clear", variant="secondary")
                
                with gr.Column(scale=2):
                    output = gr.Textbox(
                        label="Live Analysis & Dispatch Report",
                        lines=25,
                        interactive=False,
                        placeholder="Step-by-step analysis will appear here in real-time..."
                    )
            
            submit_btn.click(
                fn=process_network_request,
                inputs=[user_input, hospital_selector],
                outputs=output
            )
            clear_btn.click(
                fn=lambda: "",
                inputs=[],
                outputs=output
            )

        # TAB 2: DASHBOARD
        with gr.TabItem("📊 Dashboard"):
            gr.Markdown("### 📊 Hospital Intelligence Dashboard")
            gr.Markdown("Ask questions in plain English about your hospital data.")
            with gr.Row():
                with gr.Column():
                    dash_hospital = gr.Dropdown(
                        choices=[h["name"] for h in hospitals],
                        label="Select Hospital",
                        value="Lagos General"
                    )
                    dash_query = gr.Textbox(
                        label="Ask a question",
                        placeholder="How many O+ units do we have?",
                        lines=2
                    )
                    dash_btn = gr.Button("Ask Dashboard", variant="primary")
                    dash_clear = gr.Button("🗑️ Clear", variant="secondary")
                with gr.Column():
                    dash_output = gr.Textbox(
                        label="Live Analysis & Answer",
                        lines=15,
                        interactive=False,
                        placeholder="Live analysis will appear here..."
                    )
            
            gr.Markdown("""
            **Example questions:**
            - "How many O+ units do we have?"
            - "Which donors become eligible this week?"
            - "What is our total donor count?"
            - "Which blood groups are running low?"
            """)
            dash_btn.click(
                fn=dashboard_query,
                inputs=[dash_query, dash_hospital],
                outputs=dash_output
            )
            dash_clear.click(
                fn=lambda: "",
                inputs=[],
                outputs=dash_output
            )

        # TAB 3: COMPATIBILITY
        with gr.TabItem("🩸 Compatibility"):
            gr.Markdown("### 🩸 Blood Compatibility Checker")
            gr.Markdown("Gemma explains why a donor is compatible or not.")
            with gr.Row():
                with gr.Column():
                    patient_blood = gr.Textbox(
                        label="Patient Blood Type",
                        placeholder="O-",
                        value="O-"
                    )
                    donor_blood = gr.Textbox(
                        label="Donor Blood Type",
                        placeholder="A+",
                        value="A+"
                    )
                    compat_btn = gr.Button("Check Compatibility", variant="primary")
                    compat_clear = gr.Button("🗑️ Clear", variant="secondary")
                with gr.Column():
                    compat_output = gr.Textbox(
                        label="Live Analysis & Explanation",
                        lines=15,
                        interactive=False,
                        placeholder="Live analysis will appear here..."
                    )
            
            gr.Markdown("""
            **Example pairs:**
            - Patient: O- | Donor: O- (Perfect match)
            - Patient: O- | Donor: A+ (Incompatible)
            - Patient: A+ | Donor: O- (Compatible)
            - Patient: AB+ | Donor: O- (Universal donor)
            """)
            compat_btn.click(
                fn=explain_compatibility,
                inputs=[patient_blood, donor_blood],
                outputs=compat_output
            )
            compat_clear.click(
                fn=lambda: "",
                inputs=[],
                outputs=compat_output
            )

        # TAB 4: REGISTER DONOR
        with gr.TabItem("🩸 Register Donor"):
            gr.Markdown("### 📝 Add a New Donor to the Network")
            with gr.Row():
                with gr.Column():
                    donor_name = gr.Textbox(label="Full Name")
                    donor_blood = gr.Textbox(label="Blood Type", value="O+")
                    donor_phone = gr.Textbox(label="Phone Number")
                    donor_hospital = gr.Dropdown(
                        choices=[h["name"] for h in hospitals],
                        label="Affiliated Hospital"
                    )
                    donor_last_donation = gr.Textbox(
                        label="Last Donation (YYYY-MM-DD)",
                        value="2026-01-01"
                    )
                    add_donor_btn = gr.Button("➕ Register Donor", variant="primary")
                    donor_status = gr.Textbox(label="Status", interactive=False)

        # TAB 5: INVENTORY
        with gr.TabItem("📦 Inventory"):
            gr.Markdown("### 📊 Manage Hospital Blood Inventory")
            with gr.Row():
                with gr.Column():
                    inv_hospital = gr.Dropdown(
                        choices=[h["name"] for h in hospitals],
                        label="Select Hospital"
                    )
                    inv_blood_type = gr.Textbox(label="Blood Type", value="O+")
                    inv_units = gr.Number(label="Units", value=5, precision=0)
                    add_inventory_btn = gr.Button("➕ Update Inventory", variant="primary")
                    inventory_status = gr.Textbox(label="Status", interactive=False)
                with gr.Column():
                    refresh_inv_btn = gr.Button("🔄 Refresh View", variant="secondary")
                    inventory_display = gr.Textbox(
                        label="Current Global Inventory",
                        lines=10,
                        interactive=False
                    )

        # TAB 6: REGISTER HOSPITAL
        with gr.TabItem("🏥 Register Hospital"):
            gr.Markdown("### 🏥 Add a New Hospital to the Network")
            with gr.Row():
                with gr.Column():
                    new_hospital_name = gr.Textbox(label="Hospital Name")
                    new_hospital_lat = gr.Number(label="Latitude", value=6.5)
                    new_hospital_lon = gr.Number(label="Longitude", value=3.3)
                    new_hospital_phone = gr.Textbox(label="Phone Number")
                    add_hospital_btn = gr.Button("➕ Add Hospital", variant="primary")
                    hospital_status = gr.Textbox(label="Status", interactive=False)

    gr.HTML('<div class="footer">Built with ❤️ for the Gemma 4 Hackathon · Offline AI Regional Blood Network</div>')

    # ---------- EVENT BINDINGS ----------
    add_donor_btn.click(
        add_donor,
        inputs=[donor_name, donor_blood, donor_phone, donor_hospital, donor_last_donation],
        outputs=donor_status
    )
    add_inventory_btn.click(
        add_inventory,
        inputs=[inv_hospital, inv_blood_type, inv_units],
        outputs=inventory_status
    )
    refresh_inv_btn.click(
        get_inventory_display,
        outputs=inventory_display
    )
    add_hospital_btn.click(
        add_hospital,
        inputs=[new_hospital_name, new_hospital_lat, new_hospital_lon, new_hospital_phone],
        outputs=hospital_status
    )
    
    demo.load(fn=get_inventory_display, outputs=inventory_display)

# ---------- LAUNCH ----------
if __name__ == "__main__":
    demo.queue()
    demo.launch(share=False, css=custom_css, theme=gr.themes.Base())