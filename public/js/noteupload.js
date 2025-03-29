document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form');
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const fileInput = document.querySelector('input[type="file"]');
        const file = fileInput.files[0];
        
        if (!file) {
            alert('Please select a file');
            return;
        }
        
        if (file.type !== 'application/pdf') {
            alert('Only PDF files are allowed');
            return;
        }
        
        if (file.size > 50 * 1024 * 1024) { // 50MB limit
            alert('File size too large. Maximum size is 50MB');
            return;
        }
        
        // If validation passes, submit the form
        this.submit();
    });
}); 