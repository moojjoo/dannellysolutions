document.getElementById('year').textContent = new Date().getFullYear();

const contactForm = document.getElementById('contact-form');

if (contactForm) {
	const statusElement = document.getElementById('contact-status');
	const submitButton = contactForm.querySelector('button[type="submit"]');
	const startedAtField = document.getElementById('started-at');
	const endpoint = (contactForm.dataset.endpoint || '').trim();
	const minSubmitMs = 4000;
	const turnstileWidget = document.getElementById('turnstile-widget');
	let cachedTurnstileToken = '';

	window.onTurnstileSuccess = (token) => {
		cachedTurnstileToken = String(token || '').trim();
	};

	window.onTurnstileExpired = () => {
		cachedTurnstileToken = '';
	};

	window.onTurnstileError = () => {
		cachedTurnstileToken = '';
	};

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
		const tokenFromField = String(formData.get('cf-turnstile-response') || '').trim();
		const tokenFromApi =
			window.turnstile && typeof window.turnstile.getResponse === 'function'
				? String(window.turnstile.getResponse(turnstileWidget) || '').trim()
				: '';

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
			turnstileToken: tokenFromField || tokenFromApi || cachedTurnstileToken,
		};

		const elapsedMs = Date.now() - payload.startedAt;
		if (!payload.startedAt || Number.isNaN(elapsedMs) || elapsedMs < minSubmitMs) {
			setStatus('Please wait a moment before submitting.', 'error');
			return;
		}

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

		if (!payload.turnstileToken) {
			setStatus('Verification is required. Complete the human check, then submit.', 'error');
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
			const responseData = await response.json().catch(() => null);

			if (!response.ok) {
				throw new Error(responseData?.error || 'Submission failed. Please check your entries and try again.');
			}

			contactForm.reset();
			cachedTurnstileToken = '';
			if (startedAtField) {
				startedAtField.value = String(Date.now());
			}
			if (window.turnstile && typeof window.turnstile.reset === 'function') {
				window.turnstile.reset(turnstileWidget);
			}
			setStatus('Thanks. Your request was sent successfully. We will reply soon.', 'success');
		} catch (error) {
			setStatus(error?.message || 'Unable to send right now. Try again shortly or use the direct email option.', 'error');
		} finally {
			submitButton.disabled = false;
			contactForm.removeAttribute('aria-busy');
		}
	});
}
