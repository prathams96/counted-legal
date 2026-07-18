function setFormMessage(element, message) {
  if (element) element.textContent = message;
}

function initEarlyAccess() {
  const form = document.querySelector("#early-access-form");
  if (!form) return;

  const email = form.querySelector("input[type=email]");
  const error = document.querySelector("#early-access-error");
  const status = document.querySelector("#early-access-status");
  const retry = document.querySelector("#early-access-retry");
  const submit = form.querySelector("button[type=submit]");
  const endpoint = form.dataset.emailoctopusEndpoint || document.body.dataset.emailoctopusEndpoint || "";

  const showRetry = (visible) => {
    retry.hidden = !visible;
  };

  const showError = (message, canRetry = false) => {
    setFormMessage(error, message);
    setFormMessage(status, "");
    showRetry(canRetry);
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFormMessage(error, "");
    setFormMessage(status, "");
    showRetry(false);

    if (!email.checkValidity()) {
      setFormMessage(error, "Enter a valid email address so we know where to send the welcome note.");
      email.focus();
      return;
    }

    if (!endpoint) {
      // Keep the site honest until a real EmailOctopus embedded-form endpoint
      // is configured. Never pretend to have added an address to a list.
      showError("The early-access list is being connected. Your address is still here; email support if you would like to join now.");
      showRetry(true);
      return;
    }

    submit.disabled = true;
    submit.textContent = "Joining...";
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: new FormData(form),
        credentials: "omit",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Provider responded with ${response.status}`);
      setFormMessage(status, "You're on the early-access list. A welcome note is on its way.");
      form.reset();
    } catch {
      showError("We couldn't reach the early-access list. Your address is still here. Please try again or email support.", true);
    } finally {
      submit.disabled = false;
      submit.textContent = "Join early access";
    }
  });

  retry.addEventListener("click", () => form.requestSubmit());
}

initEarlyAccess();
