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

async function deleteNote(nid) {
    if (!confirm('Are you sure you want to delete this note?')) {
        return;
    }

    try {
        console.log('Attempting to delete note:', nid);
        const response = await fetch(`/deleteNote/${nid}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include' // Include cookies for authentication
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log('Note deleted successfully');
            window.location.reload();
        } else {
            console.error('Failed to delete note:', data.error);
            alert('Failed to delete note: ' + data.error);
        }
    } catch (error) {
        console.error('Error deleting note:', error);
        alert('Failed to delete note. Please try again.');
    }
}

// Add event listeners when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add click event listeners to all delete buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const nid = this.getAttribute('data-nid');
            deleteNote(nid);
        });
    });
}); 