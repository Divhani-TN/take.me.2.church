
document.addEventListener('DOMContentLoaded', () => {

    const stepsWrapper = document.querySelector('.steps-wrapper');
    const stepItems = document.querySelectorAll('.step-item');
    const formSteps = document.querySelectorAll('.form-step');

    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');

    const totalSteps = stepItems.length;
    const radius = 180;

    let currentStep = 1;
    let isAnimating = false;

    if (!stepsWrapper || !nextBtn || !prevBtn) {
        console.error('Navigation elements are missing.');
        return;
    }

    if (typeof gsap === 'undefined') {
        console.error('GSAP has not loaded.');
        return;
    }

   
    function positionSteps() {

        const center = stepsWrapper.clientWidth / 2;

        stepItems.forEach((item, index) => {

            const angle = (-90 + index * (360 / totalSteps))
                * (Math.PI / 180);

            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);

            item.style.left = `${x}px`;
            item.style.top = `${y}px`;

        });
    }

 
    positionSteps();

    gsap.set(stepsWrapper, {
        rotation: 0,
        transformOrigin: 'center center'
    });

    
    formSteps.forEach((form, index) => {

        const active = index === 0;

        form.classList.toggle('active', active);

        gsap.set(form, {
            display: active ? 'block' : 'none',
            opacity: active ? 1 : 0,
            y: 0
        });

    });

    // Update buttons and active circles
    function updateNavigation() {

        stepItems.forEach((item, index) => {
            item.classList.toggle(
                'active',
                index === currentStep - 1
            );
        });

        prevBtn.disabled = currentStep === 1;
        nextBtn.disabled = currentStep === totalSteps;
    }

    updateNavigation();

    // Navigate to a particular step
    function goToStep(step) {

        if (
            step < 1 ||
            step > totalSteps ||
            step === currentStep ||
            isAnimating
        ) {
            return;
        }

        const oldForm = document.getElementById(
            `form-${currentStep}`
        );

        const newForm = document.getElementById(
            `form-${step}`
        );

        if (!oldForm || !newForm) {
            console.error(`Form ${step} does not exist.`);
            return;
        }

        isAnimating = true;

        const targetRotation =
            -(step - 1) * (360 / totalSteps);

        currentStep = step;
        updateNavigation();

        // Rotate circle
        gsap.to(stepsWrapper, {
            rotation: targetRotation,
            duration: 1,
            ease: 'power3.inOut'
        });

        // Fade out old form
        gsap.to(oldForm, {
            opacity: 0,
            y: 15,
            duration: 0.3,

            onComplete: () => {

                oldForm.classList.remove('active');

                gsap.set(oldForm, {
                    display: 'none'
                });

                newForm.classList.add('active');

                // Fade in new form
                gsap.fromTo(
                    newForm,
                    {
                        display: 'block',
                        opacity: 0,
                        y: -15
                    },
                    {
                        opacity: 1,
                        y: 0,
                        duration: 0.5,
                        ease: 'power2.out',

                        onComplete: () => {
                            isAnimating = false;
                        }
                    }
                );

            }
        });

    }

    // Next
    nextBtn.addEventListener('click', () => {
        goToStep(currentStep + 1);
    });

    // Previous
    prevBtn.addEventListener('click', () => {
        goToStep(currentStep - 1);
    });

    // Click individual circles
    stepItems.forEach(item => {

        item.addEventListener('click', () => {

            const step = Number(item.dataset.step);

            goToStep(step);

        });

    });

    // Recalculate positions on window resize
    window.addEventListener('resize', positionSteps);

});
const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');

        // Example: Just to show the disabled state working
        prevBtn.addEventListener('click', () => {
            // Logic to load previous page goes here
            console.log("Previous form page");
            // If on page 1, disable prev button
            prevBtn.disabled = true; 
            nextBtn.disabled = false;
        });

        nextBtn.addEventListener('click', () => {
            
            console.log("Next formpage");
            
            nextBtn.disabled = true; 
            prevBtn.disabled = false;
        });