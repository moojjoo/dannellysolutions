document.getElementById('year').textContent = new Date().getFullYear();

const contactForm = document.getElementById('contact-form');

if (contactForm) {
	const statusElement = document.getElementById('contact-status');
	const submitButton = contactForm.querySelector('button[type="submit"]');
	const startedAtField = document.getElementById('started-at');
	const endpoint = (contactForm.dataset.endpoint || '').trim();

	if (startedAtField) {
		startedAtField.value = String(Date.now());
	}

	const setStatus = (message, state) => {
		if (!statusElement) {
			return;
		}
		statusElement.textContent = message;
		statusElement.classList.remove('is-error', 'is-success');
		if (state === 'error') {
			statusElement.classList.add('is-error');
		}
		if (state === 'success') {
			statusElement.classList.add('is-success');
		}
	};

	const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

	contactForm.addEventListener('submit', async (event) => {
		event.preventDefault();

		const formData = new FormData(contactForm);
		const payload = {
			fullName: String(formData.get('fullName') || '').trim(),
			workEmail: String(formData.get('workEmail') || '').trim(),
			companyName: String(formData.get('companyName') || '').trim(),
			serviceType: String(formData.get('serviceType') || '').trim(),
			timeline: String(formData.get('timeline') || '').trim(),
			budgetRange: String(formData.get('budgetRange') || '').trim(),
			projectSummary: String(formData.get('projectSummary') || '').trim(),
			contactPreference: String(formData.get('contactPreference') || '').trim(),
			startedAt: Number(formData.get('startedAt') || 0),
			companySite: String(formData.get('companySite') || '').trim(),
		};

		if (!payload.fullName || payload.fullName.length < 2 || payload.fullName.length > 80) {
			setStatus('Enter your full name (2-80 characters).', 'error');
			return;
		}
		if (!payload.workEmail || payload.workEmail.length > 120 || !validEmail(payload.workEmail)) {
			setStatus('Enter a valid work email address.', 'error');
			return;
		}
		if (!payload.companyName || payload.companyName.length < 2 || payload.companyName.length > 100) {
			setStatus('Enter your company name (2-100 characters).', 'error');
			return;
		}
		if (!payload.serviceType) {
			setStatus('Select the service you need.', 'error');
			return;
		}
		if (!payload.timeline) {
			setStatus('Select your timeline.', 'error');
			return;
		}
		if (!payload.projectSummary || payload.projectSummary.length < 20 || payload.projectSummary.length > 1500) {
			setStatus('Project summary must be between 20 and 1500 characters.', 'error');
			return;
		}
		if (payload.contactPreference.length > 120) {
			setStatus('Contact preference must be 120 characters or less.', 'error');
			return;
		}

		if (!endpoint || endpoint.includes('REPLACE_WITH_LAMBDA_FUNCTION_URL')) {
			setStatus('Contact endpoint is not configured yet. Use the fallback email button for now.', 'error');
			return;
		}

		submitButton.disabled = true;
		contactForm.setAttribute('aria-busy', 'true');
		setStatus('Sending your request...', null);

		try {
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				throw new Error('Submission failed');
			}

			contactForm.reset();
			if (startedAtField) {
				startedAtField.value = String(Date.now());
			}
			setStatus('Thanks. Your request was sent successfully. We will reply soon.', 'success');
		} catch (error) {
			setStatus('Unable to send right now. Try again shortly or use the direct email option.', 'error');
		} finally {
			submitButton.disabled = false;
			contactForm.removeAttribute('aria-busy');
		}
	});
}
