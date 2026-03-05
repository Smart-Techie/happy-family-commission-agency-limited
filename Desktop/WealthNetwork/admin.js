// ==================== ADMIN DASHBOARD FUNCTIONS ====================

// Initialize the dashboard on load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin dashboard initialized');
    loadMembers();
    loadAdminStats();
});

// ==================== MEMBER MANAGEMENT ====================

/**
* Loads and displays all members in the admin table
*/
function loadMembers() {
    const members = JSON.parse(localStorage.getItem('members')) || [];
    const tbody = document.getElementById('membersTableBody');
   
    if (!tbody) return;

    tbody.innerHTML = '';

    if (members.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: #64748b;">No members found.</td></tr>';
        return;
    }

    members.forEach((member, index) => {
        const row = document.createElement('tr');
        const status = getMemberStatus(member);
       
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div class="member-avatar" style="width: 35px; height: 35px; background: #1e6f5c; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                        ${member.name ? member.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <strong>${member.name || 'N/A'}</strong>
                </div>
            </td>
            <td>
                <div style="font-size: 0.85rem;">📧 ${member.email || 'N/A'}</div>
                <div style="font-size: 0.85rem;">📞 ${member.phone || 'N/A'}</div>
            </td>
            <td>${member.joinDate || 'N/A'}</td>
            <td><strong>₦${(member.totalPaid || 0).toLocaleString()}</strong></td>
            <td><span class="status-badge status-${status.class}" style="padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: bold;">${status.text}</span></td>
            <td>${getLastPayment(member)}</td>
            <td>
                <div class="action-buttons" style="display: flex; gap: 5px;">
                    <button class="action-btn view-btn" title="View" onclick="viewMember(${member.id})">👁️</button>
                    <button class="action-btn edit-btn" title="Edit" onclick="editMember(${member.id})">✏️</button>
                    <button class="action-btn payment-btn" title="Add Payment" onclick="addPayment(${member.id})">💰</button>
                    <button class="action-btn delete-btn" title="Delete" onclick="deleteMember(${member.id})">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/**
* Logic to determine if a member is Active (paid within 35 days) or Inactive
*/
function getMemberStatus(member) {
    if (!member.payments || member.payments.length === 0) {
        return { text: 'New', class: 'inactive' };
    }
   
    const lastPayment = new Date(member.payments[member.payments.length - 1].date);
    const now = new Date();
    const diffTime = Math.abs(now - lastPayment);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
   
    if (diffDays <= 35) {
        return { text: 'Active', class: 'active' };
    } else {
        return { text: 'Inactive', class: 'inactive' };
    }
}

function getLastPayment(member) {
    if (!member.payments || member.payments.length === 0) return 'No payments';
    const last = member.payments[member.payments.length - 1];
    return `${formatDate(last.date)} (₦${last.amount.toLocaleString()})`;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-NG', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

// ==================== MEMBER ACTIONS ====================

function viewMember(id) {
    const members = JSON.parse(localStorage.getItem('members')) || [];
    const member = members.find(m => m.id === id);
    if (!member) return;

    const details = `
        MEMBER PROFILE:
        ------------------
        Name: ${member.name}
        Email: ${member.email}
        Phone: ${member.phone}
        Joined: ${member.joinDate}
        Total Invested: ₦${(member.totalPaid || 0).toLocaleString()}
        Status: ${getMemberStatus(member).text}
    `;
    alert(details);
}

function editMember(id) {
    const members = JSON.parse(localStorage.getItem('members')) || [];
    const index = members.findIndex(m => m.id === id);
    if (index === -1) return;

    const member = members[index];
    const newName = prompt('Update Name:', member.name);
    const newPhone = prompt('Update Phone:', member.phone);

    if (newName) members[index].name = newName;
    if (newPhone) members[index].phone = newPhone;

    localStorage.setItem('members', JSON.stringify(members));
    loadMembers();
    alert('Member details updated.');
}

function addPayment(id) {
    const members = JSON.parse(localStorage.getItem('members')) || [];
    const index = members.findIndex(m => m.id === id);
    if (index === -1) return;

    const amount = prompt('Enter Payment Amount (₦):', '10000');
    if (!amount || isNaN(amount)) return;
   
    const val = parseInt(amount);
    const payment = {
        date: new Date().toISOString().split('T')[0],
        amount: val,
        status: 'approved'
    };

    if (!members[index].payments) members[index].payments = [];
    members[index].payments.push(payment);
    members[index].totalPaid = (members[index].totalPaid || 0) + val;
   
    localStorage.setItem('members', JSON.stringify(members));
    loadMembers();
    loadAdminStats();
    alert(`Successfully credited ₦${val.toLocaleString()} to ${members[index].name}.`);
}

function deleteMember(id) {
    if (!confirm('Warning: Deleting this member is permanent. Proceed?')) return;

    let members = JSON.parse(localStorage.getItem('members')) || [];
    members = members.filter(m => m.id !== id);
    localStorage.setItem('members', JSON.stringify(members));

    loadMembers();
    loadAdminStats();
}

// ==================== SEARCH AND FILTER ====================

function searchMembers() {
    const query = document.getElementById('memberSearch')?.value.toLowerCase() || '';
    const members = JSON.parse(localStorage.getItem('members')) || [];

    const filtered = members.filter(m =>
        m.name.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query) ||
        m.phone.includes(query)
    );

    renderCustomTable(filtered);
}

function filterMembers() {
    const filter = document.getElementById('memberFilter')?.value || 'all';
    const members = JSON.parse(localStorage.getItem('members')) || [];
   
    let filtered = members;
    if (filter === 'active') {
        filtered = members.filter(m => getMemberStatus(m).text === 'Active');
    } else if (filter === 'inactive') {
        filtered = members.filter(m => getMemberStatus(m).text === 'Inactive');
    } else if (filter === 'new') {
        const currentMonth = new Date().getMonth();
        filtered = members.filter(m => new Date(m.joinDate).getMonth() === currentMonth);
    }

    renderCustomTable(filtered);
}

function renderCustomTable(data) {
    const tbody = document.getElementById('membersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
   
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">No matching results.</td></tr>';
        return;
    }
   
    // Logic follows loadMembers() loop...
    loadMembers(); // Using simplified re-render for this demo
}

// ==================== STATISTICS ====================

function loadAdminStats() {
    const members = JSON.parse(localStorage.getItem('members')) || [];
    const gallery = JSON.parse(localStorage.getItem('gallery')) || [];
   
    const totalMembersEl = document.getElementById('totalMembers');
    const pooledFundsEl = document.getElementById('pooledFunds');
    const activeMembersEl = document.getElementById('activeMembers');
    const galleryCountEl = document.getElementById('galleryCount');

    if (totalMembersEl) totalMembersEl.textContent = members.length;
   
    if (pooledFundsEl) {
        const total = members.reduce((sum, m) => sum + (m.totalPaid || 0), 0);
        pooledFundsEl.textContent = `₦${total.toLocaleString()}`;
    }
   
    if (activeMembersEl) {
        const count = members.filter(m => getMemberStatus(m).text === 'Active').length;
        activeMembersEl.textContent = count;
    }

    if (galleryCountEl) galleryCountEl.textContent = gallery.length;
}

// ==================== DATA EXPORT ====================

function exportMembers() {
    const members = JSON.parse(localStorage.getItem('members')) || [];
    if (members.length === 0) return alert('No data to export.');

    let csv = 'Name,Email,Phone,Join Date,Total Paid (NGN),Status\n';
   
    members.forEach(m => {
        csv += `"${m.name}","${m.email}","${m.phone}","${m.joinDate}",${m.totalPaid},"${getMemberStatus(m).text}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `malc_nexus_members_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
    a.click();
}

// Add to admin.js
function backupData() {
    const data = {
        members: localStorage.getItem('members'),
        gallery: localStorage.getItem('gallery'),
        payments: localStorage.getItem('payments'),
        date: new Date().toISOString()
    };
   
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `malc-nexus-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

function restoreData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = JSON.parse(e.target.result);
            if (data.members) localStorage.setItem('members', data.members);
            if (data.gallery) localStorage.setItem('gallery', data.gallery);
            if (data.payments) localStorage.setItem('payments', data.payments);
            alert('Data restored! Refresh page.');
            location.reload();
        };
        reader.readAsText(file);
    };
    input.click();
}