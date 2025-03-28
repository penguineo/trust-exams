// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// DOM elements
const loginTab = document.getElementById("login-tab");
const registerTab = document.getElementById("register-tab");
const loginPanel = document.getElementById("login-panel");
const registerPanel = document.getElementById("register-panel");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const examinerTypeBtn = document.getElementById("examiner-type");
const studentTypeBtn = document.getElementById("student-type");

// Current user type (default: examiner)
let userType = "examiner";

// Check if user is already logged in
document.addEventListener("DOMContentLoaded", async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    // Redirect based on role
    if (profile && profile.role === "examiner") {
      window.location.href = "/examiner/dashboard";
    } else {
      window.location.href = "/student/dashboard";
    }
  }
});

// Tab functionality
loginTab.addEventListener("click", () => {
  loginTab.classList.add("border-blue-500", "text-blue-500");
  registerTab.classList.remove("border-blue-500", "text-blue-500");
  loginPanel.classList.remove("hidden");
  registerPanel.classList.add("hidden");
});

registerTab.addEventListener("click", () => {
  registerTab.classList.add("border-blue-500", "text-blue-500");
  loginTab.classList.remove("border-blue-500", "text-blue-500");
  registerPanel.classList.remove("hidden");
  loginPanel.classList.add("hidden");
});

// User type selection
examinerTypeBtn.addEventListener("click", () => {
  userType = "examiner";
  examinerTypeBtn.classList.add("bg-blue-500", "text-white");
  examinerTypeBtn.classList.remove("bg-gray-100", "text-gray-700");
  studentTypeBtn.classList.add("bg-gray-100", "text-gray-700");
  studentTypeBtn.classList.remove("bg-blue-500", "text-white");
});

studentTypeBtn.addEventListener("click", () => {
  userType = "student";
  studentTypeBtn.classList.add("bg-blue-500", "text-white");
  studentTypeBtn.classList.remove("bg-gray-100", "text-gray-700");
  examinerTypeBtn.classList.add("bg-gray-100", "text-gray-700");
  examinerTypeBtn.classList.remove("bg-blue-500", "text-white");
});

// Login form submission
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    showToast("Logged in successfully", "success");

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    // Redirect based on role
    if (profile && profile.role === "examiner") {
      window.location.href = "/examiner/dashboard";
    } else {
      window.location.href = "/student/dashboard";
    }
  } catch (error) {
    showToast(error.message || "Failed to log in", "error");
  }
});

// Register form submission
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("register-name").value;
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          role: userType,
        },
      },
    });

    if (error) throw error;

    showToast(
      "Account created successfully! Please check your email for verification.",
      "success",
    );
    loginTab.click(); // Switch to login tab
  } catch (error) {
    showToast(error.message || "Failed to create account", "error");
  }
});

// Show toast notification
function showToast(message, type = "success") {
  // Remove existing toast if any
  const existingToast = document.querySelector(".toast");
  if (existingToast) {
    existingToast.remove();
  }

  // Create new toast
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  // Show toast
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  // Hide toast after 3 seconds
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}
