   const toggleBtn = document.getElementById('viewToggleBtn');
        const churchList = document.getElementById('churchList');

        
        toggleBtn.addEventListener('click', () => {
            
            churchList.classList.toggle('map-view');
            
           
            if (churchList.classList.contains('map-view')) {
                toggleBtn.textContent = 'MAP | LIST';
            } else {
                toggleBtn.textContent = 'LIST | MAP';
            }
        });