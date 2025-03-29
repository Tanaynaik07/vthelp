document.addEventListener('DOMContentLoaded', function() {
    // Handle paper deletion
    document.getElementById('deletePaperForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const pid = document.getElementById('paperId').value;

        if (!confirm(`Are you sure you want to delete paper with ID ${pid}?`)) {
            return;
        }

        try {
            const response = await fetch(`/deletePaper/${pid}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            const data = await response.json();
            
            if (response.ok) {
                alert('Paper deleted successfully');
                document.getElementById('paperId').value = '';
            } else {
                alert('Failed to delete paper: ' + data.error);
            }
        } catch (error) {
            console.error('Error deleting paper:', error);
            alert('Failed to delete paper. Please try again.');
        }
    });

    // Handle note deletion
    document.getElementById('deleteNoteForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const nid = document.getElementById('noteId').value;

        if (!confirm(`Are you sure you want to delete note with ID ${nid}?`)) {
            return;
        }

        try {
            const response = await fetch(`/deleteNote/${nid}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            const data = await response.json();
            
            if (response.ok) {
                alert('Note deleted successfully');
                document.getElementById('noteId').value = '';
            } else {
                alert('Failed to delete note: ' + data.error);
            }
        } catch (error) {
            console.error('Error deleting note:', error);
            alert('Failed to delete note. Please try again.');
        }
    });
}); 