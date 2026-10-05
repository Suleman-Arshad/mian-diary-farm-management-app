"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Milk,
  Building2,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthService } from "@/lib/auth";
import { useAuth } from "@/components/auth/AuthProvider";
import { signupSchema, SignupFormValues } from "@/lib/validations";
import { toast } from "@/components/ui/toast";

export default function SignupPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      businessName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: SignupFormValues) => {
    try {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const result = await AuthService.signUp({
        businessName: values.businessName,
        email: values.email,
        phone: values.phone,
        password: values.password,
      });

      if (result.hasSession) {
        login(result.user);
      } else {
        setSuccessMsg(
          result.message ||
            "Account registered successfully! Please check your email to verify your account or proceed to login."
        );
      }
    } catch (err: any) {
      if (err) console.error("Supabase Error:", err);
      const rawMessage = (err?.message || "").toLowerCase();
      const isEmailRateLimit =
        rawMessage.includes("email rate limit exceeded") ||
        rawMessage.includes("rate limit") ||
        err?.code === "over_email_send_rate_limit" ||
        err?.status === 429;

      if (isEmailRateLimit) {
        const friendlyMsg = "Too many signup attempts. Please wait a few minutes or contact support.";
        setErrorMsg(friendlyMsg);
        toast.error(friendlyMsg);
      } else {
        const fallbackMsg =
          err?.message || "Failed to create an account. Please verify details.";
        setErrorMsg(fallbackMsg);
        toast.error(fallbackMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-10 relative overflow-hidden">
      {/* Background ambient aesthetic lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-400 text-white shadow-xl shadow-sky-500/25 ring-4 ring-white/10 mb-1">
            <Milk className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Create Dairy Admin Account
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Setup your milk distribution workspace and daily dispatch registry
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Admin Registration</span>
          </div>
        </div>

        {/* Card Form */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-5">
          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center gap-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-400 font-medium animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="flex items-start gap-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs text-emerald-400 font-medium animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              <div className="space-y-2">
                <span>{successMsg}</span>
                <div>
                  <Link href="/login">
                    <Button
                      size="sm"
                      variant="dairy"
                      className="text-xs h-8 px-3 mt-1"
                    >
                      Proceed to Login
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Dairy / Business Name */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-300">
                Dairy / Business Name
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  type="text"
                  placeholder="e.g. Mian Dairy Farm"
                  {...register("businessName")}
                  className="pl-9 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-sky-500"
                />
              </div>
              {errors.businessName && (
                <p className="text-[11px] text-rose-400 font-medium">
                  {errors.businessName.message}
                </p>
              )}
            </div>

            {/* Email Address */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-300">
                Admin Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  type="email"
                  placeholder="admin@miandairy.com"
                  {...register("email")}
                  className="pl-9 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-sky-500"
                />
              </div>
              {errors.email && (
                <p className="text-[11px] text-rose-400 font-medium">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-300">
                Contact Phone Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  type="tel"
                  placeholder="0300-1234567"
                  {...register("phone")}
                  className="pl-9 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-sky-500"
                />
              </div>
              {errors.phone && (
                <p className="text-[11px] text-rose-400 font-medium">
                  {errors.phone.message}
                </p>
              )}
            </div>

            {/* Password & Confirm Password (Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Password */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 6 characters"
                    {...register("password")}
                    className="pl-9 pr-9 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[11px] text-rose-400 font-medium">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-type password"
                    {...register("confirmPassword")}
                    className="pl-9 pr-9 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-[11px] text-rose-400 font-medium">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="dairy"
              disabled={loading}
              className="w-full h-11 text-sm font-bold gap-2 mt-2 shadow-lg shadow-sky-600/30"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Create Dairy Admin Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Bottom Switch to Login */}
          <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-sky-400 hover:text-sky-300 hover:underline transition-colors"
            >
              Log In
            </Link>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-500">
          Mian Dairy Farm ERP &bull; Secure role-based dairy distribution management.
        </p>
      </div>
    </div>
  );
}
