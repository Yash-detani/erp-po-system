const API_URL = "http://127.0.0.1:8000";

// If already logged in, redirect to dashboard
(function checkAuth() {
    const token = localStorage.getItem("token");
    if (token) {
        window.location.href = "index.html";
    }
})();

// DOM Elements
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const loginBtnText = document.getElementById("loginBtnText");
const loginSpinner = document.getElementById("loginSpinner");
const loginError = document.getElementById("loginError");
const usernameError = document.getElementById("usernameError");
const passwordError = document.getElementById("passwordError");

/**
 * Clear all validation states
 */
function clearValidation() {
    usernameInput.classList.remove("is-invalid");
    passwordInput.classList.remove("is-invalid");
    loginError.classList.add("d-none");
    loginError.textContent = "";
}

/**
 * Validate the login form fields
 * @returns {boolean} true if valid
 */
function validateForm() {
    let isValid = true;
    clearValidation();

    if (!usernameInput.value.trim()) {
        usernameInput.classList.add("is-invalid");
        usernameError.textContent = "Username is required";
        isValid = false;
    }

    if (!passwordInput.value.trim()) {
        passwordInput.classList.add("is-invalid");
        passwordError.textContent = "Password is required";
        isValid = false;
    }

    return isValid;
}

/**
 * Set loading state on the login button
 * @param {boolean} loading
 */
function setLoading(loading) {
    loginBtn.disabled = loading;
    if (loading) {
        loginBtnText.textContent = "Signing in...";
        loginSpinner.classList.remove("d-none");
    } else {
        loginBtnText.textContent = "Sign In";
        loginSpinner.classList.add("d-none");
    }
}

/**
 * Show error message on the login form
 * @param {string} message
 */
function showError(message) {
    loginError.textContent = message;
    loginError.classList.remove("d-none");
}

/**
 * Handle form submission - authenticate user
 */
loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                username: usernameInput.value.trim(),
                password: passwordInput.value.trim(),
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            showError(data.detail || "Login failed. Please try again.");
            setLoading(false);
            return;
        }

        // Store token and redirect
        localStorage.setItem("token", data.access_token);
        window.location.href = "index.html";
    } catch (error) {
        showError("Unable to connect to server. Please try again later.");
        setLoading(false);
    }
});

// Clear validation on input
usernameInput.addEventListener("input", () => {
    usernameInput.classList.remove("is-invalid");
    loginError.classList.add("d-none");
});

passwordInput.addEventListener("input", () => {
    passwordInput.classList.remove("is-invalid");
    loginError.classList.add("d-none");
});
