import type React from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EyeIcon, EyeOffIcon, LockIcon } from "lucide-react";
import { useState } from "react";

export function EncryptedZipDialog({
  onSubmit,
  children,
}: {
  onSubmit: (password: string) => Promise<void>;
  children: React.ReactNode;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const reset = () => {
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsSubmitting(false);
    setError(null);
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      setError("Password is required");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(password);
      reset();
    } catch (_err) {
      setError("Failed to encrypt file. Please try again.");
      console.error(_err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordsMismatch = password && confirmPassword && password !== confirmPassword;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) return reset();
        setIsOpen(open);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LockIcon className="h-5 w-5 text-primary" />
            Encrypted File
          </DialogTitle>
          <DialogDescription>Enter and confirm your password to encrypt</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription>
                <span className="font-mono text-destructive">{error}</span>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="enc-zip-password" className="sr-only">
              Password
            </Label>
            <div className="relative">
              <Input
                id="enc-zip-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
                autoComplete="off"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="enc-zip-confirm-password" className="sr-only">
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="enc-zip-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`pr-10 ${passwordsMismatch ? "border-destructive focus:border-destructive" : ""}`}
                autoComplete="off"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                <span className="sr-only">{showConfirmPassword ? "Hide password" : "Show password"}</span>
              </Button>
            </div>
            {passwordsMismatch && (
              <span className="block text-xs font-mono text-destructive mt-1">Passwords do not match</span>
            )}
          </div>

          <DialogFooter className="sm:justify-between">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={reset}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={Boolean(isSubmitting || !password || !confirmPassword || passwordsMismatch)}
            >
              {isSubmitting ? "Encrypting..." : "Download"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
