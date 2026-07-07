# 🩸 Haemo-Agent Network

### Offline AI Emergency Blood Coordination | Powered by Gemma 4

![Status](https://img.shields.io/badge/Status-Hackathon_Ready-red)
![Offline](https://img.shields.io/badge/Offline-100%25-brightgreen)
![Voice](https://img.shields.io/badge/Feature-Voice_Enabled-blue)
![Gemma](https://img.shields.io/badge/Powered%20By-Gemma%204-red)

---

## 🚨 The Problem

In rural Nigeria, hospitals frequently lose internet connectivity. When a trauma patient arrives needing blood, doctors lose access to donor databases. They resort to panicked phone calls—calling 10, 20, even 50 hospitals to find blood. 

**Patients bleed out while they wait.**

---

## 💡 Our Solution

**Haemo-Agent Network** is a fully offline AI coordination system. When a doctor speaks or types an emergency, Gemma 4 extracts the blood type, searches the local network, and returns a complete **Emergency Dispatch Report**—all without internet.

**The doctor gets three instant options:**

1.  **🩸 Hospital Donors** – Eligible donors with phone numbers and distances.
2.  **📦 On-Site Inventory** – Blood units available in the hospital fridge.
3.  **🏥 Nearby Hospitals** – Hospitals within 50km that have the blood in stock.

---

## 🎤 Key Features

- **🎙️ Voice Search** – Doctors speak, the AI listens. Hands-free for emergencies.
- **🧠 Agentic AI** – Gemma 4 extracts blood types, Python executes the search.
- **🗺️ Offline Math** – Haversine formula calculates distances locally.
- **📋 Printable Reports** – Clear, actionable dispatch instructions.
- **📦 Scalable Mock Data** – Pre-loaded hospitals, donors, and inventory for instant demos.

---



## 🛠️ Tech Stack

- **AI Model:** Google Gemma 4 (via Ollama)
- **Framework:** Python 3.12 + Gradio UI
- **Logic:** Offline donor search, eligibility checks, Haversine distance math
- **Speech:** SpeechRecognition + PyAudio

---

## 📋 How to Run (For Judges & Developers)

### Prerequisites
- Windows, Mac, or Linux
- Python 3.12 (3.13 is not supported)
- Ollama installed ([ollama.com](https://ollama.com))

### Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone <your-repo-link>
    cd HaemoAgent
