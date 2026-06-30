'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, MessageSquare, Send } from 'lucide-react';
import { Logo } from '../../components/shared/Logo';
import { Button } from '../../components/ui/Button';
import { toast } from 'sonner';
import { fetchWithAuth } from '../../lib/api';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetchWithAuth('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Message sent! We will get back to you soon.');
        setName(''); setEmail(''); setSubject(''); setMessage('');
      } else {
        toast.error(data.message || 'Failed to send message.');
      }
    } catch {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 lg:p-20">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <Logo />
          <Link href="/home" className="text-xs font-medium text-muted-foreground hover:text-accent flex items-center gap-2 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </header>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-accent" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground italic">Contact Us</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Have a question, concern, or feedback? Fill out the form below and we&apos;ll get back to you as soon as possible.
            For urgent child safety concerns, please use our <Link href="/child-safety" className="text-accent hover:underline font-medium">Child Safety page</Link>.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 bg-card border border-border rounded-2xl p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-xs font-medium text-foreground">Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-medium text-foreground">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="subject" className="text-xs font-medium text-foreground">Subject <span className="text-destructive">*</span></label>
              <select
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                required
              >
                <option value="">Select a subject...</option>
                <option value="general">General Inquiry</option>
                <option value="support">Technical Support</option>
                <option value="feedback">Feedback / Suggestion</option>
                <option value="report">Report a Violation</option>
                <option value="privacy">Privacy Question</option>
                <option value="legal">Legal Request</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="message" className="text-xs font-medium text-foreground">Message <span className="text-destructive">*</span></label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                placeholder="Describe your question or concern..."
                required
              />
            </div>

            <Button type="submit" disabled={!subject || !message || submitting} loading={submitting} className="w-full gap-2">
              <Send className="w-4 h-4" />
              {submitting ? 'Sending...' : 'Send Message'}
            </Button>
          </form>

          <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
            <Mail className="w-5 h-5 text-accent flex-shrink-0" />
            <div className="text-sm">
              <p className="text-foreground font-medium">Prefer to email us directly?</p>
              <a href="mailto:spherebrilliq@gmail.com" className="text-accent hover:underline text-xs">spherebrilliq@gmail.com</a>
            </div>
          </div>
        </div>

        <footer className="pt-8 border-t border-border">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest text-center">
            &copy; 2026 Sphere of Brilliance
          </p>
        </footer>
      </div>
    </div>
  );
}
