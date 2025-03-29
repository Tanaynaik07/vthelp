function togglePaper(header) {
    const content = header.nextElementSibling;
    const icon = header.querySelector('.toggle-icon');
    
    if (content.style.maxHeight) {
        content.style.maxHeight = null;
        icon.textContent = '▼';
    } else {
        content.style.maxHeight = content.scrollHeight + "px";
        icon.textContent = '▲';
    }
}

async function deletePaper(pid) {
    if (!confirm('Are you sure you want to delete this paper?')) {
        return;
    }

    try {
        console.log('Attempting to delete paper:', pid);
        const response = await fetch(`/deletePaper/${pid}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include' // Include cookies for authentication
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log('Paper deleted successfully');
            window.location.reload();
        } else {
            console.error('Failed to delete paper:', data.error);
            alert('Failed to delete paper: ' + data.error);
        }
    } catch (error) {
        console.error('Error deleting paper:', error);
        alert('Failed to delete paper. Please try again.');
    }
}

// Add event listeners when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add click event listeners to all delete buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const pid = this.getAttribute('data-pid');
            deletePaper(pid);
        });
    });
}); 