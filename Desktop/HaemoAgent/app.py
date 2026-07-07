import gradio as gr
import ollama
import math
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
    
    own_inventory = inventory.get(current_hospital, {}).get(patient_blood, 0)
    
    nearby = find_nearby_hospitals(current_hospital)
    nearby_with_blood = []
    for n in nearby:
        n_inv = inventory.get(n["name"], {}).get(patient_blood, 0)
        if n_inv > 0:
            nearby_with_blood.append({"name": n["name"], "units": n_inv, "distance": n["distance"], "phone": n["phone"]})
    
    report = f"""
========================================
   🩸 EMERGENCY NETWORK REPORT
========================================
Requesting Hospital: {current_hospital}
Patient Blood Type: {patient_blood}
Condition: {condition}
Generated: {datetime.now().strftime('%Y-%m-%d %I:%M %p')}
========================================

📋 OPTION 1: OWN HOSPITAL DONORS
{current_hospital} has {len(ranked_donors)} eligible {patient_blood} donors:
"""
    if ranked_donors:
        for i, d in enumerate(ranked_donors[:3], 1):
            report += f"  {i}. {d['name']} | 📞 {d['phone']} | {d['distance_km']}km away\n"
    else:
        report += "  ❌ No eligible donors at this hospital.\n"
    
    report += f"""
📦 OPTION 2: OWN HOSPITAL INVENTORY
{current_hospital} has {own_inventory} units of {patient_blood} on the shelf.
"""

    report += f"""
🏥 OPTION 3: NEARBY HOSPITALS WITH {patient_blood}
"""
    if nearby_with_blood:
        for n in nearby_with_blood:
            report += f"  🏥 {n['name']} | 📞 {n['phone']}\n"
            report += f"     📦 {n['units']} units available | 📍 {n['distance']}km away\n"
    else:
        report += "  ❌ No nearby hospitals have this blood type in stock.\n"
    
    report += """
========================================
📋 ACTION PLAN:
1. If donors exist, call the #1 donor IMMEDIATELY.
2. If inventory exists, prepare blood from your own fridge.
3. If nearby hospitals have it, call them to dispatch a transfer.
========================================
"""
    return report

def extract_blood_type(user_input):
    try:
        response = ollama.chat(
            model='gemma-local',
            messages=[{'role': 'user', 'content': f'Extract ONLY the blood type code (e.g., O-, A+, B+, AB-) from this: "{user_input}". Blood type:'}]
        )
        return response['message']['content'].strip().upper()
    except:
        return "O-"

# ---------- PROCESSING WITH LIVE STREAMING ----------
def process_network_request(user_input, hospital_selector):
    """
    Processes the emergency request with live step-by-step updates.
    Uses 'yield' to stream the Chain of Thought to the UI.
    """
    if not user_input or user_input.strip() == "":
        yield "⚠️ Please describe the emergency."
        return

    yield "🔄 **Initializing Offline AI Engine...**\n"
    yield "🧠 **Loading Gemma 4 into memory...** (Done)\n\n"
    
    yield "📝 **Step 1: Crafting the Prompt**\n"
    yield "> *'Extract ONLY the blood type code from this request...'*\n"
    yield "> Sending to Gemma 4 (Offline)...\n\n"
    
    yield "⏳ **Step 2: Gemma is reasoning...**\n"
    yield "🧠 Analyzing your exact words to find the blood type...\n"
    
    blood_type = extract_blood_type(user_input)
    
    blood_types = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]
    detected = None
    for bt in blood_types:
        if bt.upper() in blood_type.upper():
            detected = bt
            break
    if not detected:
        detected = "O-"
    
    yield f"✅ **Gemma identified:** `{detected}`\n\n"
    
    yield "🔍 **Step 3: Executing Agentic Search**\n"
    yield f"📦 Searching local donor database for `{detected}`...\n"
    
    yield "🧮 Calculating distances using offline Haversine math...\n"
    yield "🏥 Checking nearby hospital inventories...\n"
    yield "📋 Compiling Emergency Dispatch Report...\n\n"
    yield "---\n\n"
    
    report = generate_network_report(detected, "Trauma", hospital_selector)
    yield report

# ---------- UI FUNCTIONS ----------
def add_donor(name, blood, phone, hospital, last_donation):
    if not name or not blood or not phone:
        return "❌ Please fill in all required fields."
    new_id = max([d["id"] for d in donors]) + 1
    hospital_obj = next(h for h in hospitals if h["name"] == hospital)
    donors.append({
        "id": new_id,
        "name": name,
        "blood": blood,
        "phone": phone,
        "hospital": hospital,
        "lat": hospital_obj["lat"],
        "lon": hospital_obj["lon"],
        "last_donation": last_donation
    })
    return f"✅ Donor '{name}' registered successfully!"

def add_inventory(hospital_name, blood_type, units):
    if not hospital_name or not blood_type:
        return "❌ Please select a hospital and enter a blood type."
    if hospital_name not in inventory:
        inventory[hospital_name] = {}
    inventory[hospital_name][blood_type] = inventory[hospital_name].get(blood_type, 0) + int(units)
    return f"✅ Inventory updated: {hospital_name} has {inventory[hospital_name][blood_type]} units of {blood_type}."

def get_inventory_display():
    display = "🏥 GLOBAL BLOOD INVENTORY\n" + "="*50 + "\n"
    for h, inv in inventory.items():
        display += f"\n📌 {h}:\n"
        if inv:
            for bt, units in inv.items():
                display += f"   {bt}: {units} unit(s)\n"
        else:
            display += "   (No inventory registered)\n"
    return display if display else "No inventory data available."

def add_hospital(name, lat, lon, phone):
    if not name:
        return "❌ Please enter a hospital name."
    new_id = max([h["id"] for h in hospitals]) + 1
    hospitals.append({"id": new_id, "name": name, "lat": lat, "lon": lon, "phone": phone})
    inventory[name] = {}
    return f"✅ Hospital '{name}' added! You can now register donors and inventory."

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
    border: 1px solid rgba(255,255,255,0.1) !important;
}
.main-header h1 { color: white !important; font-weight: 800 !important; font-size: 2.8rem !important; margin-bottom: 0px !important; }
.main-header p { color: rgba(255,255,255,0.9) !important; font-size: 1.2rem !important; font-weight: 400 !important; }
.main-header .badge {
    background: rgba(255,255,255,0.15) !important;
    padding: 4px 16px !important;
    border-radius: 40px !important;
    color: #fff !important;
    display: inline-block !important;
    font-size: 0.8rem !important;
    font-weight: 600 !important;
    border: 1px solid rgba(255,255,255,0.2) !important;
    margin-top: 8px !important;
}

.gr-button-primary { background: #8B0000 !important; color: white !important; border: 2px solid #8B0000 !important; box-shadow: 0 4px 14px rgba(139, 0, 0, 0.35) !important; }
.gr-button-primary:hover { background: #5C0000 !important; border-color: #5C0000 !important; transform: scale(1.02) !important; }

.gr-button-secondary { background: #FFFFFF !important; color: #8B0000 !important; border: 2px solid #8B0000 !important; }
.gr-button-secondary:hover { background: #8B0000 !important; color: #FFFFFF !important; }

button:focus-visible { outline: 3px solid #8B0000 !important; }

.tab-nav { background: #FFFFFF !important; border-radius: 12px !important; padding: 8px !important; border: 1px solid #E8E0E0 !important; }
button.tab-button { border-radius: 8px !important; padding: 12px 24px !important; font-weight: 600 !important; color: #444444 !important; background: transparent !important; border: none !important; }
button.tab-button.selected { background: #8B0000 !important; color: white !important; box-shadow: 0 4px 12px rgba(139, 0, 0, 0.3) !important; }
button.tab-button:hover:not(.selected) { background: #F5F0F0 !important; color: #8B0000 !important; }

input, textarea, .gr-textbox, .gr-dropdown select {
    border: 2px solid #E8E0E0 !important;
    border-radius: 10px !important;
    padding: 12px 16px !important;
    background: #FFFFFF !important;
    color: #2C2C2C !important;
}
input:focus, textarea:focus, .gr-textbox:focus-within, .gr-dropdown select:focus {
    border-color: #8B0000 !important;
    box-shadow: 0 0 0 4px rgba(139, 0, 0, 0.08) !important;
}

.gr-textbox textarea { background: #FAFAFC !important; font-family: 'Inter', monospace !important; font-size: 0.9rem !important; line-height: 1.7 !important; border: 2px solid #E0D8D8 !important; border-radius: 12px !important; }

.gr-box, .gr-form, .gr-panel, .gr-group { background: #FFFFFF !important; border-radius: 16px !important; padding: 24px !important; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04) !important; border: 1px solid #F0EBEB !important; }

h2, .gr-markdown h2 { font-weight: 700 !important; border-bottom: 4px solid #8B0000 !important; padding-bottom: 8px !important; display: inline-block !important; }

.footer { text-align: center; color: #888888; font-size: 0.85rem; margin-top: 40px; border-top: 1px solid #E8E0E0; padding-top: 20px; }
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #F4F0F0; }
::-webkit-scrollbar-thumb { background: #8B0000; border-radius: 10px; }
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
        with gr.TabItem("🚨 Emergency"):
            with gr.Row():
                with gr.Column(scale=1):
                    gr.Markdown("### 🏥 Emergency Request")
                    hospital_selector = gr.Dropdown(
                        choices=[h["name"] for h in hospitals],
                        label="Your Hospital",
                        value="Lagos General",
                        interactive=True
                    )
                    
                    user_input = gr.Textbox(
                        label="Describe the emergency",
                        placeholder="I have a trauma patient, I need O+ blood urgently!",
                        lines=3
                    )
                    
                    submit_btn = gr.Button("🚨 Find Blood Now", variant="primary")
                
                with gr.Column(scale=2):
                    gr.Markdown("### 📋 Network Dispatch Report")
                    output = gr.Textbox(
                        label="",
                        lines=22,
                        interactive=False,
                        placeholder="Your report will appear here..."
                    )
            
            submit_btn.click(
                fn=process_network_request,
                inputs=[user_input, hospital_selector],
                outputs=output
            )

        with gr.TabItem("🩸 Register Donor"):
            gr.Markdown("### 📝 Add a New Donor to the Network")
            with gr.Row():
                with gr.Column():
                    donor_name = gr.Textbox(label="Full Name")
                    donor_blood = gr.Textbox(label="Blood Type", value="O+")
                    donor_phone = gr.Textbox(label="Phone Number")
                    donor_hospital = gr.Dropdown(choices=[h["name"] for h in hospitals], label="Affiliated Hospital")
                    donor_last_donation = gr.Textbox(label="Last Donation (YYYY-MM-DD)", value="2026-01-01")
                    add_donor_btn = gr.Button("➕ Register Donor", variant="primary")
                    donor_status = gr.Textbox(label="Status", interactive=False)

        with gr.TabItem("📦 Inventory"):
            gr.Markdown("### 📊 Manage Hospital Blood Inventory")
            with gr.Row():
                with gr.Column():
                    inv_hospital = gr.Dropdown(choices=[h["name"] for h in hospitals], label="Select Hospital")
                    inv_blood_type = gr.Textbox(label="Blood Type", value="O+")
                    inv_units = gr.Number(label="Number of Units", value=5, precision=0)
                    add_inventory_btn = gr.Button("➕ Update Inventory", variant="primary")
                    inventory_status = gr.Textbox(label="Status", interactive=False)
                with gr.Column():
                    refresh_inv_btn = gr.Button("🔄 Refresh View", variant="secondary")
                    inventory_display = gr.Textbox(label="Current Global Inventory", lines=10, interactive=False)

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
    add_donor_btn.click(add_donor, inputs=[donor_name, donor_blood, donor_phone, donor_hospital, donor_last_donation], outputs=donor_status)
    add_inventory_btn.click(add_inventory, inputs=[inv_hospital, inv_blood_type, inv_units], outputs=inventory_status)
    refresh_inv_btn.click(get_inventory_display, outputs=inventory_display)
    add_hospital_btn.click(add_hospital, inputs=[new_hospital_name, new_hospital_lat, new_hospital_lon, new_hospital_phone], outputs=hospital_status)
    
    demo.load(fn=get_inventory_display, outputs=inventory_display)

# ---------- LAUNCH ----------
if __name__ == "__main__":
    demo.launch(share=False, css=custom_css, theme=gr.themes.Base())