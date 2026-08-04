import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import AuthLayout from "../components/AuthLayout";
import FormField from "../components/FormField";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../utils/errorMessage";

const initialForm = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  college: "",
  department: "",
  semester: "",
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (form.password.length < 8) {
      next.password = "Password must be at least 8 characters.";
    }
    if (form.password !== form.confirmPassword) {
      next.confirmPassword = "Passwords do not match.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const { confirmPassword, ...payload } = form;
      await register(payload);
      toast.success("Account created! Welcome aboard.");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const message = getErrorMessage(err, "Could not create your account.");
      toast.error(message);
      setErrors((prev) => ({ ...prev, email: message }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Start learning with your AI study companion.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField
          label="Full Name"
          name="name"
          placeholder="Jane Doe"
          value={form.name}
          onChange={handleChange}
          required
        />
        <FormField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Password"
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            required
          />
          <FormField
            label="Confirm Password"
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="••••••••"
            value={form.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            required
          />
        </div>

        <FormField
          label="College (optional)"
          name="college"
          placeholder="MIT"
          value={form.college}
          onChange={handleChange}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Department (optional)"
            name="department"
            placeholder="Computer Science"
            value={form.department}
            onChange={handleChange}
          />
          <FormField
            label="Semester (optional)"
            name="semester"
            placeholder="5"
            value={form.semester}
            onChange={handleChange}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
