document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form');
    
    form.addEventListener('submit', function(e) {
        const fileInput = document.querySelector('input[type="file"]');
        const file = fileInput.files[0];
        
        if (!file) {
            e.preventDefault();
            alert('Please select a PDF file to upload');
            return;
        }
        
        if (file.type !== 'application/pdf') {
            e.preventDefault();
            alert('Only PDF files are allowed');
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            e.preventDefault();
            alert('File size too large. Maximum size is 10MB for papers');
            return;
        }
    });
}); 