document.addEventListener('DOMContentLoaded', () => {
    // Mobile Sidebar Toggle
    const menuBtn = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    // Create overlay if it doesn't exist
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
    }

    const toggleSidebar = () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    };

    if (menuBtn) {
        menuBtn.addEventListener('click', toggleSidebar);
    }

    if (overlay) {
        overlay.addEventListener('click', toggleSidebar);
    }

    // Ripple effect for buttons
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const ripple = document.createElement('span');
            ripple.style.position = 'absolute';
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            ripple.style.transform = 'translate(-50%, -50%)';
            ripple.style.width = '0px';
            ripple.style.height = '0px';
            ripple.style.borderRadius = '50%';
            ripple.style.background = 'rgba(255, 255, 255, 0.3)';
            ripple.style.pointerEvents = 'none';
            ripple.style.animation = 'ripple-anim 0.6s linear';

            // Add animation keyframes dynamically if needed, 
            // but relying on CSS is better. Let's assume global css or inline style.
            ripple.style.transition = 'width 0.5s, height 0.5s, opacity 0.5s';

            this.appendChild(ripple);

            requestAnimationFrame(() => {
                ripple.style.width = '300px';
                ripple.style.height = '300px';
                ripple.style.opacity = '0';
            });

            setTimeout(() => {
                ripple.remove()
            }, 600);
        });
    });

    // Floating Labels / Input Interactions (Optional Enhancement)
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => {
        // Add minimal focus persistence logic if needed
        input.addEventListener('focus', () => {
            input.parentElement.classList.add('focused');
        });
        input.addEventListener('blur', () => {
            input.parentElement.classList.remove('focused');
        });
    });
    // Initialize Icons
    if (window.lucide) {
        lucide.createIcons();
    }
});
