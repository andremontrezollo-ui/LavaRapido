import { useState, useRef, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Mail, 
  Shield, 
  Clock, 
  Key,
  AlertCircle,
  Loader2
} from "lucide-react";
import { contactFormSchema, type ContactFormData } from "@/lib/validation";
import { VALIDATION_LIMITS } from "@/lib/constants";
import { createContactTicket } from "@/lib/api";
import { InlineError } from "@/components/system/feedback/InlineError";
import { SuccessMessage } from "@/components/system/feedback/SuccessMessage";

interface FormErrors {
  subject?: string;
  message?: string;
  replyContact?: string;
}

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ContactFormData>({
    subject: "",
    message: "",
    replyContact: "",
  });

  // Refs for focus management
  const subjectRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  const handleChange = (field: keyof ContactFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (apiError) setApiError(null);
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = contactFormSchema.safeParse(formData);
    
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof FormErrors;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      // Focus first invalid field for accessibility
      if (fieldErrors.subject) {
        subjectRef.current?.focus();
      } else if (fieldErrors.message) {
        messageRef.current?.focus();
      }
      return;
    }

    setLoading(true);
    setApiError(null);

    const apiResult = await createContactTicket({
      subject: formData.subject,
      message: formData.message,
      replyContact: formData.replyContact || undefined,
    });

    setLoading(false);

    if (apiResult.error) {
      setApiError(
        apiResult.status === 429
          ? "Too many requests. Please wait a few minutes before trying again."
          : apiResult.error.message
      );
      return;
    }

    if (apiResult.data) {
      setTicketId(apiResult.data.ticketId);
      setSubmitted(true);
      setErrors({});
      // Focus success message on next frame
      requestAnimationFrame(() => successRef.current?.focus());
    }
  }, [formData]);

  const handleNewMessage = () => {
    setSubmitted(false);
    setTicketId("");
    setFormData({ subject: "", message: "", replyContact: "" });
    setErrors({});
    setApiError(null);
  };

  const pgpKeyNotice = "🔑 PGP key not yet configured.\n\nThis is a demonstration environment.\nIn production, a valid PGP public key will be\npublished here for encrypted communications.";

  return (
    <Layout>
      {/* Hero */}
      <section className="pt-32 pb-16 relative">
        <div className="absolute inset-0 bg-gradient-dark" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/10 via-transparent to-transparent" />
        
        <div className="container relative mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-6">
            <span className="gradient-text">Contact</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Secure and anonymous communication channel
          </p>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Form */}
              <div className="glass-card p-8">
                {!submitted ? (
                  <>
                    <h2 className="font-heading font-semibold text-xl mb-6">
                      Send Message
                    </h2>

                    {apiError && (
                      <InlineError
                        message={apiError}
                        onRetry={() => setApiError(null)}
                        className="mb-6"
                      />
                    )}

                    <form
                      onSubmit={handleSubmit}
                      className="space-y-6"
                      noValidate
                      aria-label="Contact form"
                    >
                      <div>
                        <Label htmlFor="contact-subject" className="text-muted-foreground">
                          Subject
                        </Label>
                        <Input
                          ref={subjectRef}
                          id="contact-subject"
                          placeholder="Briefly describe your question"
                          className={`mt-2 ${errors.subject ? "border-destructive" : ""}`}
                          value={formData.subject}
                          onChange={(e) => handleChange("subject", e.target.value)}
                          maxLength={VALIDATION_LIMITS.subject.maxLength}
                          autoComplete="off"
                          disabled={loading}
                          aria-invalid={!!errors.subject}
                          aria-describedby={errors.subject ? "subject-error" : undefined}
                        />
                        {errors.subject && (
                          <p id="subject-error" role="alert" className="text-xs text-destructive mt-1">
                            {errors.subject}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="contact-message" className="text-muted-foreground">
                          Message
                        </Label>
                        <Textarea
                          ref={messageRef}
                          id="contact-message"
                          placeholder="Detail your question or issue"
                          className={`mt-2 min-h-[150px] ${errors.message ? "border-destructive" : ""}`}
                          value={formData.message}
                          onChange={(e) => handleChange("message", e.target.value)}
                          maxLength={VALIDATION_LIMITS.message.maxLength}
                          disabled={loading}
                          aria-invalid={!!errors.message}
                          aria-describedby={
                            errors.message
                              ? "message-error message-count"
                              : "message-count"
                          }
                        />
                        <div className="flex justify-between mt-1">
                          {errors.message ? (
                            <p id="message-error" role="alert" className="text-xs text-destructive">
                              {errors.message}
                            </p>
                          ) : (
                            <span />
                          )}
                          <span id="message-count" className="text-xs text-muted-foreground">
                            {formData.message.length}/{VALIDATION_LIMITS.message.maxLength}
                          </span>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="contact-reply" className="text-muted-foreground">
                          Reply contact (optional)
                        </Label>
                        <Input
                          id="contact-reply"
                          placeholder="Email, PGP key, Session ID, etc."
                          className={`mt-2 ${errors.replyContact ? "border-destructive" : ""}`}
                          value={formData.replyContact}
                          onChange={(e) => handleChange("replyContact", e.target.value)}
                          maxLength={VALIDATION_LIMITS.replyContact.maxLength}
                          autoComplete="off"
                          disabled={loading}
                          aria-invalid={!!errors.replyContact}
                          aria-describedby={errors.replyContact ? "reply-error" : "reply-hint"}
                        />
                        {errors.replyContact ? (
                          <p id="reply-error" role="alert" className="text-xs text-destructive mt-1">
                            {errors.replyContact}
                          </p>
                        ) : (
                          <p id="reply-hint" className="text-xs text-muted-foreground mt-2">
                            You can leave blank and use the ticket ID to check replies
                          </p>
                        )}
                      </div>

                      <Button
                        variant="hero"
                        type="submit"
                        className="w-full"
                        disabled={loading}
                        aria-busy={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                            Sending…
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4 mr-2" aria-hidden="true" />
                            Send Message
                          </>
                        )}
                      </Button>
                    </form>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div
                      className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6"
                      aria-hidden="true"
                    >
                      <svg
                        className="h-8 w-8 text-success"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>

                    <SuccessMessage
                      ref={successRef}
                      title="Message Sent"
                      description="Your message has been received successfully."
                      className="mb-6 text-left"
                    >
                      <div className="mt-4 p-4 rounded-xl bg-secondary border border-primary/30">
                        <p className="text-sm text-muted-foreground mb-2">Ticket ID</p>
                        <code className="text-2xl font-mono font-bold text-primary select-all block">
                          {ticketId}
                        </code>
                      </div>
                      <p className="text-sm text-muted-foreground mt-3">
                        Save this ID to track your request
                      </p>
                    </SuccessMessage>

                    <Button
                      variant="outline"
                      className="mt-2"
                      onClick={handleNewMessage}
                    >
                      Send new message
                    </Button>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="space-y-6">
                <div className="glass-card p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0" aria-hidden="true">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold mb-1">Privacy</h3>
                      <p className="text-sm text-muted-foreground">
                        We don't collect mandatory personal data. Your reply 
                        contact is optional.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0" aria-hidden="true">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold mb-1">Response Time</h3>
                      <p className="text-sm text-muted-foreground">
                        We typically respond within 24-48 hours. We don't guarantee 
                        specific response times.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0" aria-hidden="true">
                      <Key className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold mb-1">Encrypted Communication</h3>
                      <p className="text-sm text-muted-foreground">
                        For sensitive communications, you can use our 
                        public PGP key available below.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
                    <Key className="h-4 w-4 text-primary" aria-hidden="true" />
                    Public PGP Key
                  </h3>
                  <div className="p-4 rounded-lg bg-secondary font-mono text-xs text-muted-foreground overflow-x-auto">
                    <pre className="whitespace-pre-wrap break-all">
                      {pgpKeyNotice}
                    </pre>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-warning/5 border border-warning/20 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-medium text-warning mb-1">Warning</p>
                    <p className="text-sm text-muted-foreground">
                      We will never ask for seeds, private keys, or for you to 
                      send additional funds. Any such request is a fraud attempt.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
