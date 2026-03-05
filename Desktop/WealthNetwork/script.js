// ==================== LOCAL STORAGE SETUP ====================

// Initialize storage with sample data if empty
if (!localStorage.getItem('members')) {
    const sampleMembers = [
        {
            id: 1,
            name: "John Member",
            email: "member@test.com",
            phone: "0800 000 0000",
            password: "member123",
            joinDate: "2024-01-15",
            totalPaid: 40000,
            payments: [
                { date: "2024-01-15", amount: 10000, status: "Paid" },
                { date: "2024-02-01", amount: 10000, status: "Paid" },
                { date: "2024-02-15", amount: 10000, status: "Paid" },
                { date: "2024-03-01", amount: 10000, status: "Paid" }
            ]
        }
    ];
    localStorage.setItem('members', JSON.stringify(sampleMembers));
}

if (!localStorage.getItem('gallery')) {
    const sampleGallery = [
        {
            id: 1,
            title: "Bitterkolor Red Oil - Batch 1",
            type: "Agricultural",
            date: "2024-01-15",
            description: "First batch of premium red oil",
            imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400"
        },
        {
            id: 2,
            title: "Palm Plantation Investment",
            type: "Agricultural",
            date: "2024-02-01",
            description: "New palm plantation acquisition",
            imageUrl: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400"
        }
    ];
    localStorage.setItem('gallery', JSON.stringify(sampleGallery));
}

if (!localStorage.getItem('currentUser')) {
    localStorage.setItem('currentUser', JSON.stringify(null));
}

// Admin configuration
const ADMIN_EMAIL = "admin@malcnexus.com";
const ADMIN_PASSWORD = "admin123";
const ADMIN_CODE = "MALC2024";

// ==================== AUTHENTICATION ====================

function signupMember() {
    const name = document.getElementById('fullName')?.value;
    const email = document.getElementById('email')?.value;
    const phone = document.getElementById('phone')?.value;
    const password = document.getElementById('password')?.value;

    if (!name || !email || !phone || !password) {
        alert('Please fill all fields');
        return;
    }

    const members = JSON.parse(localStorage.getItem('members')) || [];
   
    if (members.some(m => m.email === email)) {
        alert('Email already registered. Please login.');
        window.location.href = 'login.html';
        return;
    }

    const newMember = {
        id: Date.now(),
        name,
        email,
        phone,
        password,
        joinDate: new Date().toISOString().split('T')[0],
        totalPaid: 0,
        payments: []
    };

    members.push(newMember);
    localStorage.setItem('members', JSON.stringify(members));
   
    // Auto login
    localStorage.setItem('currentUser', JSON.stringify({
        id: newMember.id,
        name: newMember.name,
        email: newMember.email,
        role: 'member'
    }));
   
    alert('Account created successfully!');
    window.location.href = 'member-dashboard.html';
}

function handleLogin() {
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    const adminCode = document.getElementById('adminCode')?.value;
    const activeTab = document.querySelector('.tab-btn.active')?.textContent || 'Member';

    if (!email || !password) {
        alert('Please enter email and password');
        return;
    }

    if (activeTab === 'Admin') {
        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD && adminCode === ADMIN_CODE) {
            localStorage.setItem('currentUser', JSON.stringify({
                name: 'Admin',
                email: ADMIN_EMAIL,
                role: 'admin'
            }));
            window.location.href = 'admin-dashboard.html';
        } else {
            alert('Invalid admin credentials');
        }
    } else {
        const members = JSON.parse(localStorage.getItem('members')) || [];
        const member = members.find(m => m.email === email && m.password === password);
       
        if (member) {
            localStorage.setItem('currentUser', JSON.stringify({
                id: member.id,
                name: member.name,
                email: member.email,
                role: 'member'
            }));
            window.location.href = 'member-dashboard.html';
        } else {
            alert('Invalid email or password');
        }
    }
}

function logout() {
    localStorage.setItem('currentUser', JSON.stringify(null));
    window.location.href = 'index.html';
}

// ==================== UI & COUNTDOWN ====================

function updateCountdown() {
    const daysEl = document.getElementById('days');
    if (!daysEl) return;

    const now = new Date();
    const nextCycle = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const diff = nextCycle - now;
   
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
   
    document.getElementById('days').textContent = String(days).padStart(2, '0');
    document.getElementById('hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
}

if (document.getElementById('countdown')) {
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// ==================== CHATBOT & MODALS ====================

function toggleChat() {
    const chat = document.getElementById('chatbot');
    if (chat) chat.style.display = chat.style.display === 'block' ? 'none' : 'block';
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    const messages = document.getElementById('chatMessages');
    const msg = input?.value.trim();
   
    if (!msg || !messages) return;
   
    messages.innerHTML += `<div style="background: #1e6f5c; color: white; padding: 0.5rem; border-radius: 10px; margin-bottom: 0.5rem; text-align: right; align-self: flex-end;">${msg}</div>`;
   
    setTimeout(() => {
        let reply = "I'm here to help! ";
        if (msg.toLowerCase().includes('payment')) reply = "Monthly contribution is ₦20k to Fidelity Bank 5601660874.";
        else if (msg.toLowerCase().includes('gallery')) reply = "Log in to view investment photos.";
       
        messages.innerHTML += `<div style="background: #e9f2f0; padding: 0.5rem; border-radius: 10px; margin-bottom: 0.5rem;">${reply}</div>`;
        messages.scrollTop = messages.scrollHeight;
    }, 500);
   
    input.value = '';
}

function switchTab(type) {
    const tabs = document.querySelectorAll('.tab-btn');
    const adminCodeGroup = document.getElementById('adminCodeGroup');
    if (tabs.length < 2) return;

    if (type === 'member') {
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
        if (adminCodeGroup) adminCodeGroup.style.display = 'none';
    } else {
        tabs[1].classList.add('active');
        tabs[0].classList.remove('active');
        if (adminCodeGroup) adminCodeGroup.style.display = 'block';
    }
}

function openModal(type) { document.getElementById(type + 'Modal').style.display = 'flex'; }
function closeModal(type) { document.getElementById(type + 'Modal').style.display = 'none'; }

window.onclick = function(e) {
    if (e.target.classList.contains('modal')) e.target.style.display = 'none';
};

// ==================== PAYMENT FUNCTIONS ====================

/**
* Calculates the next installment deadline based on the current date.
* Useful for keeping members informed of their payment schedule.
*/
function getNextDueDate() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
   
    // First installment typically due: 1st of month
    // Second installment typically due: 15th of month
   
    if (now.getDate() <= 15) {
        return `15th ${now.toLocaleString('default', { month: 'long' })} ${currentYear}`;
    } else {
        const nextMonth = new Date(currentYear, currentMonth + 1, 1);
        return `1st ${nextMonth.toLocaleString('default', { month: 'long' })} ${nextMonth.getFullYear()}`;
    }
}

/**
* Copies the network's bank details to the user's clipboard for easy pasting in banking apps.
*/
function copyBankDetails() {
    const details = `Malc Nexus Wealth Network\nAccount: 5601660874\nBank: Fidelity Bank\nName: Malc Nexus Technologies Ltd\nAmount: ₦10,000 (Installment) or ₦20,000 (Full Month)`;
    navigator.clipboard.writeText(details).then(() => {
        alert('Bank details copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}

/**
* Handles the submission of a payment receipt.
* Converts the image to a Base64 string for local storage persistence.
*/
function submitPayment() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        alert('Please login first');
        window.location.href = 'login.html';
        return;
    }

    const amount = document.getElementById('paymentAmount').value;
    const paymentDate = document.getElementById('paymentDate').value;
    const transactionRef = document.getElementById('transactionRef').value || 'N/A';
    const paymentNotes = document.getElementById('paymentNotes').value || '';
    const receiptFile = document.getElementById('paymentReceipt').files[0];

    if (!amount || !paymentDate || !receiptFile) {
        alert('Please fill all required fields and upload your receipt image');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const receiptData = e.target.result;
       
        const paymentRecord = {
            id: Date.now(),
            memberId: currentUser.id,
            memberName: currentUser.name,
            amount: parseInt(amount),
            date: paymentDate,
            transactionRef: transactionRef,
            notes: paymentNotes,
            receipt: receiptData,
            status: 'pending', // Status starts as pending until admin approval
            submittedAt: new Date().toISOString()
        };

        // Save to global payments log
        const payments = JSON.parse(localStorage.getItem('payments')) || [];
        payments.push(paymentRecord);
        localStorage.setItem('payments', JSON.stringify(payments));

        // Sync with member's personal history record
        const members = JSON.parse(localStorage.getItem('members')) || [];
        const memberIndex = members.findIndex(m => m.id === currentUser.id);
       
        if (memberIndex !== -1) {
            if (!members[memberIndex].payments) members[memberIndex].payments = [];
            members[memberIndex].payments.push({
                date: paymentDate,
                amount: parseInt(amount),
                status: 'pending',
                reference: transactionRef
            });
            localStorage.setItem('members', JSON.stringify(members));
        }

        document.getElementById('paymentForm').reset();
        alert('Receipt submitted! Admin will verify and update your total balance shortly.');
        loadMemberPayments(currentUser.id);
    };

    reader.readAsDataURL(receiptFile);
}

/**
* Renders the payment history table specifically for the logged-in member.
*/
function loadMemberPayments(memberId) {
    const allPayments = JSON.parse(localStorage.getItem('payments')) || [];
    const memberPayments = allPayments.filter(p => p.memberId === memberId)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
   
    const tbody = document.getElementById('fullPaymentHistory');
    if (!tbody) return;

    if (memberPayments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No payment history yet</td></tr>';
        return;
    }

    tbody.innerHTML = memberPayments.map(payment => {
        const statusClass = payment.status === 'approved' ? 'status-paid' :
                           payment.status === 'rejected' ? 'status-rejected' : 'status-pending';
       
        return `
            <tr>
                <td>${formatDate(payment.date)}</td>
                <td><strong>₦${payment.amount.toLocaleString()}</strong></td>
                <td>${payment.transactionRef}</td>
                <td><button class="action-btn view-btn" onclick="viewReceipt(${payment.id})">👁️ View Receipt</button></td>
                <td><span class="status-badge ${statusClass}">${payment.status.toUpperCase()}</span></td>
                <td>
                    ${payment.status === 'pending' ?
                        `<button class="action-btn delete-btn" onclick="cancelPayment(${payment.id})">Cancel</button>` :
                        '-'}
                </td>
            </tr>
        `;
    }).join('');
}

function viewReceipt(paymentId) {
    const payments = JSON.parse(localStorage.getItem('payments')) || [];
    const payment = payments.find(p => p.id === paymentId);
    if (payment && payment.receipt) {
        document.getElementById('receiptImage').src = payment.receipt;
        openModal('receipt');
    }
}

function cancelPayment(paymentId) {
    if (!confirm('Cancel this payment submission?')) return;

    let payments = JSON.parse(localStorage.getItem('payments')) || [];
    payments = payments.filter(p => p.id !== paymentId);
    localStorage.setItem('payments', JSON.stringify(payments));

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    loadMemberPayments(currentUser.id);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-NG', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

// Ensure UI components are updated when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const dueDateEl = document.getElementById('nextDueDate');
    if (dueDateEl) dueDateEl.textContent = getNextDueDate();
   
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser && currentUser.role === 'member') {
        loadMemberPayments(currentUser.id);
    }
});

// ==================== PAYMENT FUNCTIONS ====================

/**
* Submits a payment receipt for admin review.
* Handles the file conversion to Base64 and updates local storage.
*/
function submitPayment() {
    console.log('Submit payment function called');
   
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        alert('Please login first');
        window.location.href = 'login.html';
        return;
    }

    
    const amount = document.getElementById('paymentAmount')?.value;
    const paymentDate = document.getElementById('paymentDate')?.value;
    const transactionRef = document.getElementById('transactionRef')?.value || 'N/A';
    const paymentNotes = document.getElementById('paymentNotes')?.value || '';
    const receiptFile = document.getElementById('paymentReceipt')?.files[0];

    // Validation
    if (!amount || !paymentDate || !receiptFile) {
        alert('Please fill all required fields and upload the receipt.');
        return;
    }

    // UI Loading State
    const submitBtn = event.target;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Uploading...';
    submitBtn.disabled = true;

    const reader = new FileReader();
    reader.onload = function(e) {
        const receiptData = e.target.result;
       
        const paymentRecord = {
            id: Date.now(),
            memberId: currentUser.id,
            memberName: currentUser.name,
            amount: parseInt(amount),
            date: paymentDate,
            transactionRef: transactionRef,
            notes: paymentNotes,
            receipt: receiptData,
            status: 'pending',
            submittedAt: new Date().toISOString()
        };

        // Save to central payments database
        const payments = JSON.parse(localStorage.getItem('payments')) || [];
        payments.push(paymentRecord);
        localStorage.setItem('payments', JSON.stringify(payments));

        // Sync with members data for profile overview
        const members = JSON.parse(localStorage.getItem('members')) || [];
        const memberIndex = members.findIndex(m => m.id === currentUser.id);
       
        if (memberIndex !== -1) {
            if (!members[memberIndex].payments) members[memberIndex].payments = [];
            members[memberIndex].payments.push({
                date: paymentDate,
                amount: parseInt(amount),
                status: 'pending',
                reference: transactionRef
            });
            localStorage.setItem('members', JSON.stringify(members));
        }

        document.getElementById('paymentForm').reset();
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
       
        alert('✅ Payment receipt submitted successfully! It will be reviewed by admin.');
       
        if (typeof loadMemberPayments === 'function') {
            loadMemberPayments(currentUser.id);
        }
    };

    reader.onerror = function() {
        alert('Error processing file.');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    };

    reader.readAsDataURL(receiptFile);
}

/**
* Loads the history of payments for the specific logged-in member.
*/
function loadMemberPayments(memberId) {
    const payments = JSON.parse(localStorage.getItem('payments')) || [];
    const memberPayments = payments.filter(p => p.memberId === memberId)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
   
    const tbody = document.getElementById('fullPaymentHistory');
    if (!tbody) return;

    if (memberPayments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No payment history yet</td></tr>';
        return;
    }

    tbody.innerHTML = memberPayments.map(payment => {
        let statusClass = 'status-pending';
        let statusText = '⏳ Pending';
       
        if (payment.status === 'approved') {
            statusClass = 'status-approved';
            statusText = '✅ Approved';
        } else if (payment.status === 'rejected') {
            statusClass = 'status-rejected';
            statusText = '❌ Rejected';
        }
       
        return `
            <tr>
                <td>${formatDate(payment.date)}</td>
                <td><strong>₦${payment.amount.toLocaleString()}</strong></td>
                <td>${payment.transactionRef || 'N/A'}</td>
                <td>
                    <button class="action-btn view-btn" onclick="viewReceipt(${payment.id})">👁️ View</button>
                </td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td>
                    ${payment.status === 'pending' ?
                        `<button class="action-btn delete-btn" onclick="cancelPayment(${payment.id})">✖ Cancel</button>` :
                        '-'}
                </td>
            </tr>
        `;
    }).join('');
}

/**
* Opens a full-screen overlay to view the submitted receipt.
*/
function viewReceipt(paymentId) {
    const payments = JSON.parse(localStorage.getItem('payments')) || [];
    const payment = payments.find(p => p.id === paymentId);
   
    if (payment && payment.receipt) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.9); display: flex; justify-content: center;
            align-items: center; z-index: 10000; cursor: pointer;
        `;
       
        const img = document.createElement('img');
        img.src = payment.receipt;
        img.style.cssText = `max-width: 90%; max-height: 90%; border-radius: 10px;`;
       
        modal.appendChild(img);
        modal.onclick = () => document.body.removeChild(modal);
        document.body.appendChild(modal);
    }
}

function cancelPayment(paymentId) {
    if (!confirm('Cancel this payment submission?')) return;
    let payments = JSON.parse(localStorage.getItem('payments')) || [];
    payments = payments.filter(p => p.id !== paymentId);
    localStorage.setItem('payments', JSON.stringify(payments));

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) loadMemberPayments(currentUser.id);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-NG', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

function copyBankDetails() {
    const details = `Malc Nexus Wealth Network\nAccount: 5601660874\nBank: Fidelity Bank\nName: Malc Nexus Technologies Ltd\nAmount: ₦10,000 or ₦20,000`;
    navigator.clipboard.writeText(details).then(() => {
        alert('✅ Bank details copied to clipboard!');
    });
}

function getNextDueDate() {
    const now = new Date();
    if (now.getDate() <= 15) {
        return `15th ${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
    } else {
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return `1st ${nextMonth.toLocaleString('default', { month: 'long' })} ${nextMonth.getFullYear()}`;
    }
}

function updateDueDate() {
    const dueDateEl = document.getElementById('nextDueDate');
    if (dueDateEl) dueDateEl.textContent = getNextDueDate();
}

// Make sure this is at the bottom of script.js
window.submitPayment = function() {
    console.log('submitPayment called');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        alert('Please login first');
        window.location.href = 'login.html';
        return;
    }

    const amount = document.getElementById('paymentAmount')?.value;
    const paymentDate = document.getElementById('paymentDate')?.value;
    const receiptFile = document.getElementById('paymentReceipt')?.files[0];

    if (!amount || !paymentDate || !receiptFile) {
        alert('Please fill all required fields and upload receipt');
        return;
    }

    // Show success message (for testing)
    alert('Payment submitted successfully! (demo)');
   
    // In real code, you would process the file here...
};

function showLoading(show) {
    const loader = document.getElementById('loadingSpinner');
    if (loader) {
        loader.style.display = show ? 'block' : 'none';
    }
}