"use client";

import React, { useState, useEffect, useRef, use } from 'react';
import axios from 'axios';
import { CheckCircle2, AlertCircle, Upload, Star, Calendar, Hash, FileText, ArrowRight, ChevronLeft, ChevronRight, Sparkles, Mail, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import CustomSelect from '@/components/ui/CustomSelect';
import CountryPhoneInput from '@/components/ui/CountryPhoneInput';
import { LogoLoader } from "@workspace/ui";
import clsx from 'clsx';

export default function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [form, setForm] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [fileData, setFileData] = useState<Record<string, { name: string; url: string; size?: number }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ message?: string; redirectUrl?: string }>({});
  
  // Multi-step wizard state
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);

  // Field validation and submission errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submissionError, setSubmissionError] = useState<string>('');

  const containerRef = useRef<HTMLDivElement>(null);

  // ─── Bulletproof iframe auto-resize engine ───────────────────────────────
  // Ensures the iframe always expands to the full form height, never scrolls internally.
  // Key: measure containerRef (stable content) — NOT document.body (grows with iframe).
  const lastSentHeight = useRef(0);
  const resizeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/public/forms/${slug}`);
        setForm(response.data.data.form);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Form not found or is currently inactive.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchForm();
  }, [slug]);

  const sendResizeMessage = () => {
    if (typeof window === 'undefined' || !window.parent || window.parent === window) return;
    
    // Measure the true document height to ensure no scrollbars
    // We removed the +16 padding from the parent listeners so this is now safe from loops
    const height = Math.max(
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight,
      containerRef.current?.scrollHeight || 0
    );

    // Only send if height actually changed (avoid feedback loops)
    if (Math.abs(height - lastSentHeight.current) < 2) return;
    lastSentHeight.current = height;

    // 1. postMessage to parent (works cross-origin)
    window.parent.postMessage({
      type: '180workspace:form:resize',
      slug,
      height
    }, '*');

    // 2. Direct frameElement resize (works same-origin only)
    try {
      const frame = window.frameElement as HTMLIFrameElement | null;
      if (frame) {
        frame.style.height = `${height}px`;
        frame.style.overflow = 'visible';
        frame.setAttribute('scrolling', 'no');
      }
    } catch (_) {
      // Cross-origin: frameElement access throws — this is expected
    }
  };

  const debouncedResize = () => {
    if (resizeDebounce.current) clearTimeout(resizeDebounce.current);
    resizeDebounce.current = setTimeout(sendResizeMessage, 50);
  };

  // Inject a universal resize listener into the parent document
  // This handles manual iframe pastes, CodeElement iframes, and SDK iframes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.parent || window.parent === window) return;

    try {
      // Try to inject the listener directly (same-origin only)
      const parentDoc = window.parent.document;
      if (parentDoc && !parentDoc.querySelector('[data-180-form-resize-listener]')) {
        const script = parentDoc.createElement('script');
        script.setAttribute('data-180-form-resize-listener', 'true');
        script.textContent = `
          window.addEventListener('message', function(e) {
            if (!e.data || e.data.type !== '180workspace:form:resize' || !e.data.height) return;
            var iframes = document.querySelectorAll('iframe');
            for (var i = 0; i < iframes.length; i++) {
              try {
                if (iframes[i].contentWindow === e.source) {
                  iframes[i].style.height = e.data.height + 'px';
                  iframes[i].style.overflow = 'visible';
                  iframes[i].setAttribute('scrolling', 'no');
                  break;
                }
              } catch(ex) {}
            }
          });
        `;
        parentDoc.head.appendChild(script);
      }
    } catch (_) {
      // Cross-origin: can't inject script, rely on postMessage only
    }
  }, []);

  // ResizeObserver + MutationObserver for continuous height tracking
  useEffect(() => {
    if (!isLoading && form && containerRef.current) {
      // Initial burst of resize messages to catch layout shifts
      sendResizeMessage();
      const t1 = setTimeout(sendResizeMessage, 150);
      const t2 = setTimeout(sendResizeMessage, 500);
      const t3 = setTimeout(sendResizeMessage, 1500);

      // ResizeObserver on the CONTAINER (not body) — stable, no feedback loop
      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => debouncedResize());
        resizeObserver.observe(containerRef.current);
      }

      // MutationObserver for DOM changes (fields, validation) — NO attributes to avoid loop
      let mutationObserver: MutationObserver | null = null;
      if (typeof MutationObserver !== 'undefined') {
        mutationObserver = new MutationObserver(() => debouncedResize());
        mutationObserver.observe(containerRef.current, { childList: true, subtree: true });
      }

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        resizeObserver?.disconnect();
        mutationObserver?.disconnect();
        if (resizeDebounce.current) clearTimeout(resizeDebounce.current);
      };
    }
  }, [isLoading, form, formData, isSuccess, currentPageIndex]);

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
    if (fieldErrors[fieldId]) {
      setFieldErrors(prev => {
        const copy = { ...prev };
        delete copy[fieldId];
        return copy;
      });
    }
    if (submissionError) {
      setSubmissionError('');
    }
  };

  const handleCheckboxChange = (fieldId: string, option: string, checked: boolean) => {
    setFormData(prev => {
      const current = prev[fieldId] || [];
      if (checked) {
        return { ...prev, [fieldId]: [...current, option] };
      } else {
        return { ...prev, [fieldId]: current.filter((item: string) => item !== option) };
      }
    });
  };

  const handleFileUpload = async (fieldId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error('File size exceeds maximum 15MB limit');
      return;
    }

    const uploadPromise = new Promise<{ url: string; name: string }>(async (resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          // For demo / lightweight attachments, store data-url or mock url
          const resultUrl = reader.result as string;
          resolve({ url: resultUrl, name: file.name });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      } catch (err) {
        reject(err);
      }
    });

    toast.promise(uploadPromise, {
      loading: `Uploading ${file.name}...`,
      success: (data) => {
        setFileData(prev => ({ ...prev, [fieldId]: { name: file.name, url: data.url, size: file.size } }));
        setFormData(prev => ({ ...prev, [fieldId]: { url: data.url, name: file.name } }));
        return `${file.name} attached!`;
      },
      error: 'Upload failed. Please try again.'
    });
  };

  const settings = form?.settings || {};
  const pages: any[] = Array.isArray(settings.pages) && settings.pages.length > 0 
    ? settings.pages 
    : [{ id: 'page_1', title: 'Page 1', description: '', order: 0 }];
  const isMultiPage = pages.length > 1;
  const currentPage = pages[currentPageIndex] || pages[0];
  const isLastPage = currentPageIndex === pages.length - 1;
  const isFirstPage = currentPageIndex === 0;

  // Filter fields belonging to current step (or fallback for single page)
  const currentStepFields = isMultiPage 
    ? (form?.fields || []).filter((f: any) => (f.pageId || (f.validation as any)?.pageId || (f.options as any)?.pageId || 'page_1') === currentPage.id)
    : (form?.fields || []);

  const validateCurrentStep = () => {
    const errors: Record<string, string> = {};
    let firstErrorElId: string | null = null;

    for (const field of currentStepFields) {
      if (['HEADING', 'DIVIDER', 'PARAGRAPH'].includes(field.type)) continue;
      const val = formData[field.id];

      // 1. Required Check
      if (field.required) {
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          errors[field.id] = `"${field.label || 'Question'}" is required.`;
          if (!firstErrorElId) firstErrorElId = field.id;
          continue;
        }
      }

      // 2. Phone Number Validation (Must be 10 digits)
      if (field.type === 'PHONE' && val) {
        const digits = String(val).replace(/\D/g, '');
        if (digits.length < 10) {
          errors[field.id] = 'Please enter a complete 10-digit mobile number after the country code.';
          if (!firstErrorElId) firstErrorElId = field.id;
          continue;
        }
      }

      // 3. Email / Gmail Validation
      if (field.type === 'EMAIL' && val) {
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailPattern.test(String(val).trim())) {
          errors[field.id] = 'Please enter a valid email address (e.g. name@gmail.com).';
          if (!firstErrorElId) firstErrorElId = field.id;
          continue;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstErrorMsg = Object.values(errors)[0];
      toast.error(firstErrorMsg, { duration: 4000, id: 'validation-error' });
      if (firstErrorElId) {
        const el = document.getElementById(firstErrorElId);
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return false;
    }

    setFieldErrors({});
    return true;
  };

  const handleNextStep = (e: React.MouseEvent) => {
    e.preventDefault();
    if (validateCurrentStep()) {
      setCurrentPageIndex(prev => Math.min(pages.length - 1, prev + 1));
      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: 'smooth' });
      }
      setTimeout(sendResizeMessage, 150);
    }
  };

  const handlePrevStep = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentPageIndex(prev => Math.max(0, prev - 1));
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    setTimeout(sendResizeMessage, 150);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCurrentStep()) {
      return;
    }
    setIsSubmitting(true);
    
    try {
      const processedData = { ...formData };
      
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/public/forms/${slug}/submit`, {
        values: processedData,
        referrer: typeof document !== 'undefined' ? document.referrer : ''
      });

      const resData = response.data.data;
      
      // Normalize destination redirect URL (handles missing https://, relative paths, etc.)
      const rawRedirect = resData.redirectUrl || settings.redirectUrl || (form as any)?.settings?.redirectUrl || '';
      const normalizeRedirectUrl = (url?: string | null): string => {
        if (!url || typeof url !== 'string') return '';
        const trimmed = url.trim();
        if (!trimmed) return '';
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        if (trimmed.startsWith('//')) return `https:${trimmed}`;
        if (trimmed.startsWith('/')) {
          if (typeof window !== 'undefined') return `${window.location.origin}${trimmed}`;
          return trimmed;
        }
        return `https://${trimmed}`;
      };

      const targetRedirectUrl = normalizeRedirectUrl(rawRedirect);

      setIsSuccess(true);
      setSuccessInfo({
        message: resData.message || settings.successMessage || 'Your submission has been received successfully.',
        redirectUrl: targetRedirectUrl
      });

      // 1. Meta Pixel Lead Tracking
      const pixelEvent = resData.pixelEventName || settings.pixelEventName || 'Lead';
      if (typeof window !== 'undefined' && (window as any).fbq) {
        try {
          (window as any).fbq('track', pixelEvent, {
            form_slug: slug,
            form_title: form.title
          });
        } catch (e) {
          console.log('Pixel track event skipped:', e);
        }
      }

      // 2. Google Analytics / GTag Event Tracking
      if (typeof window !== 'undefined' && (window as any).gtag) {
        try {
          (window as any).gtag('event', 'generate_lead', {
            event_category: 'form',
            event_label: form.title
          });
        } catch (e) {
          console.log('Gtag event skipped:', e);
        }
      }

      // 3. Post message to parent iframe if embedded
      if (typeof window !== 'undefined' && window.parent) {
        try {
          window.parent.postMessage({
            type: '180workspace:form:submitted',
            slug,
            submissionId: resData.submissionId,
            redirectUrl: targetRedirectUrl,
            target: '_top'
          }, '*');
        } catch (_) {}
      }

      // 4. Custom Redirect URL Navigation (Instant breakout)
      if (targetRedirectUrl) {
        if (typeof window !== 'undefined') {
          try {
            if (window.top && window.top !== window) {
              window.top.location.href = targetRedirectUrl;
              return;
            }
          } catch (frameErr) {
            console.warn('Cross-origin iframe navigation restriction, falling back to direct navigation:', frameErr);
          }
          window.location.href = targetRedirectUrl;
        }
      }

    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to submit form. Please check your answers.';
      const isDuplicate = errorMsg.includes('already exists') || errorMsg.includes('Multiple submissions') || errorMsg.includes('contact information');

      if (isDuplicate) {
        // As requested: Do NOT show pop-up notification and do NOT show blocked messages.
        // Just show that number already filled the form below the text.
        const errors: Record<string, string> = {};
        currentStepFields.forEach(f => {
          if (f.type === 'PHONE' || f.mapping === 'phone' || f.label.toLowerCase().includes('phone')) {
            errors[f.id] = 'This number has already filled the form.';
          }
          if (f.type === 'EMAIL' || f.mapping === 'email' || f.label.toLowerCase().includes('email')) {
            errors[f.id] = 'This email has already filled the form.';
          }
        });
        setFieldErrors(errors);
        setSubmissionError('');
      } else {
        toast.error(errorMsg, { duration: 4000, id: 'submit-error' });
      }

      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[350px] bg-transparent">
        <LogoLoader size={36} className="w-9 h-9 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-[350px] flex items-center justify-center p-4 bg-transparent">
        <div className="w-full max-w-md backdrop-blur-md bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 p-8 rounded-2xl shadow-xl text-center">
          <div className="inline-flex bg-red-100 dark:bg-red-950/50 text-red-600 p-3 rounded-full mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">Form Unavailable</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  const isEmbed = typeof window !== 'undefined' && window.location.search.includes('embed=true');
  const primaryButtonColor = settings.buttonColor || form.company?.primaryColor || '#4f46e5';
  const primaryTextColor = settings.buttonTextColor || '#ffffff';
  const submitText = settings.submitButtonText || 'Submit Form';
  const progressPercent = Math.round(((currentPageIndex + 1) / pages.length) * 100);

  const headerImageUrl = settings.headerImage || (form as any)?.headerImage || '';
  const footerImageUrl = settings.footerImage || (form as any)?.footerImage || '';
  const footerText = settings.footerText || (form as any)?.footerText || '';
  const bgImageUrl = settings.backgroundImage || (form as any)?.backgroundImage || '';

  const backgroundStyle: React.CSSProperties = {};
  if (!isEmbed) {
    if (settings.backgroundType === 'image' && bgImageUrl) {
      backgroundStyle.backgroundImage = `url(${bgImageUrl})`;
      backgroundStyle.backgroundSize = 'cover';
      backgroundStyle.backgroundPosition = 'center';
      backgroundStyle.backgroundAttachment = 'fixed';
    } else if (settings.backgroundType === 'color' && settings.backgroundColor) {
      backgroundStyle.backgroundColor = settings.backgroundColor;
    }
  }

  if (isSuccess) {
    return (
      <div 
        className={clsx(
          "w-full flex items-center justify-center transition-all",
          isEmbed 
            ? "p-4 bg-transparent" 
            : "min-h-screen p-0 sm:p-4 bg-zinc-50/50 dark:bg-zinc-950"
        )} 
        style={backgroundStyle}
      >
        {settings.customCss && <style dangerouslySetInnerHTML={{ __html: settings.customCss }} />}
        <div className="w-full min-h-screen sm:min-h-0 sm:max-w-lg backdrop-blur-md bg-white sm:bg-white/90 dark:bg-zinc-900/90 border-0 sm:border border-emerald-500/30 p-6 sm:p-10 rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl text-center flex flex-col justify-center items-center animate-in fade-in zoom-in-95 duration-300">
          <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 shrink-0">
            <CheckCircle2 className="h-9 w-9 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight mb-2">Thank You!</h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed max-w-sm">
            {successInfo.message || settings.successMessage || 'Your submission has been received successfully.'}
          </p>
          {successInfo.redirectUrl && (
            <div className="mt-6 flex flex-col items-center justify-center gap-2 w-full">
              <a
                href={successInfo.redirectUrl}
                target={isEmbed ? '_top' : '_self'}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold text-sm sm:text-xs rounded-xl transition-all shadow-md hover:shadow-lg"
              >
                <span>Continue to destination</span>
                <ArrowRight className="w-3.5 h-3.5 ml-0.5 animate-pulse" />
              </a>
              <span className="text-[11px] text-zinc-400">Redirecting automatically...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={clsx(
        "w-full transition-all",
        isEmbed 
          ? "p-0 bg-transparent" 
          : "min-h-screen p-0 sm:px-4 sm:py-8 md:py-12 bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-start sm:justify-center items-center"
      )}
      style={backgroundStyle}
    >
      {settings.customCss && <style dangerouslySetInnerHTML={{ __html: settings.customCss }} />}
      
      <div 
        className={clsx(
          "w-full transition-all border-t-[4px] sm:border-t-[5px]",
          isEmbed
            ? "bg-transparent border-0"
            : "min-h-screen sm:min-h-0 sm:max-w-2xl sm:mx-auto bg-white dark:bg-zinc-900 sm:backdrop-blur-md sm:bg-white/95 sm:dark:bg-zinc-900/90 rounded-none sm:rounded-2xl border-0 sm:border border-zinc-200/80 dark:border-zinc-800/80 sm:shadow-xl dark:sm:shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col justify-between"
        )}
        style={{ borderTopColor: primaryButtonColor }}
      >
        {/* Optional Header Banner Image */}
        {headerImageUrl && (
          <div className="w-full max-h-72 overflow-hidden border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800">
            <img 
              src={headerImageUrl} 
              alt="Header banner" 
              className="w-full h-auto max-h-72 object-cover" 
            />
          </div>
        )}

        {/* Form Global Header */}
        <div className="px-5 py-6 sm:px-8 sm:py-8 text-center border-b border-zinc-100 dark:border-zinc-800">
          {settings.showCompanyLogo !== false && form.company?.logoUrl && (
            <div className="flex justify-center mb-5">
              <img src={form.company.logoUrl} alt={form.company.name || "Company Logo"} className="h-10 object-contain max-w-[200px]" />
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">{form.title}</h1>
          {form.description && (
            <p className="mt-2.5 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed">{form.description}</p>
          )}

          {/* Multi-Step Wizard Progress Bar */}
          {isMultiPage && (
            <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800/80 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
                <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  Step {currentPageIndex + 1} of {pages.length}
                </span>
                <span>{progressPercent}% Complete</span>
              </div>

              {/* Progress track */}
              <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%`, backgroundColor: primaryButtonColor }}
                />
              </div>

              {/* Step Title Indicator */}
              <div className="flex items-center justify-between pt-1">
                <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  {currentPage.title || `Step ${currentPageIndex + 1}`}
                </h2>
                {currentPage.description && (
                  <span className="text-xs text-zinc-400 truncate max-w-[240px]">{currentPage.description}</span>
                )}
              </div>
            </div>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="px-5 py-6 sm:px-8 sm:py-8 flex-1 flex flex-col justify-between">
          <div className="space-y-5">
            {currentStepFields.length === 0 ? (
              <div className="py-10 text-center text-zinc-400 text-sm">
                No questions found on this step.
              </div>
            ) : (
              currentStepFields.map((field: any) => {
              // Layout fields
              if (field.type === 'HEADING') {
                return (
                  <div key={field.id} className="pt-4 pb-1 border-b border-zinc-200/60 dark:border-zinc-800">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{field.label}</h3>
                    {field.description && <p className="text-xs text-zinc-500 mt-1">{field.description}</p>}
                  </div>
                );
              }

              if (field.type === 'PARAGRAPH') {
                return (
                  <div key={field.id} className="py-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {field.description || field.label}
                  </div>
                );
              }

              if (field.type === 'DIVIDER') {
                return <hr key={field.id} className="my-6 border-zinc-200 dark:border-zinc-800" />;
              }

              return (
                <div key={field.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor={field.id} className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                      {field.label} {field.required && <span className="text-red-500 font-bold">*</span>}
                    </label>
                    {field.type === 'FILE_UPLOAD' && (
                      <span className="text-[11px] text-zinc-400">Max 15MB</span>
                    )}
                  </div>

                  {field.description && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{field.description}</p>
                  )}
                  
                  {field.type === 'TEXT' && (
                    <input 
                      id={field.id}
                      type="text"
                      required={field.required}
                      placeholder={field.placeholder || ''}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
                    />
                  )}
                  
                  {field.type === 'EMAIL' && (
                    <div className="space-y-1">
                      <div className="relative">
                        <input 
                          id={field.id}
                          type="email"
                          required={field.required}
                          placeholder={field.placeholder || 'you@company.com'}
                          value={formData[field.id] || ''}
                          onChange={(e) => handleInputChange(field.id, e.target.value)}
                          className={clsx(
                            "w-full pl-10 pr-10 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border rounded-xl focus:outline-none text-sm transition-all",
                            formData[field.id] && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(String(formData[field.id]).trim())
                              ? "border-red-400 dark:border-red-500/80 bg-red-50/20 focus:ring-2 focus:ring-red-500/30 text-zinc-900 dark:text-zinc-100"
                              : formData[field.id] && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(String(formData[field.id]).trim())
                                ? "border-emerald-400 dark:border-emerald-500/80 bg-emerald-50/20 focus:ring-2 focus:ring-emerald-500/30 text-zinc-900 dark:text-zinc-100"
                                : "border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
                          )}
                        />
                        <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5 pointer-events-none" />
                        {formData[field.id] && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(String(formData[field.id]).trim()) && (
                          <span className="absolute right-3 top-3 text-emerald-500 flex items-center pointer-events-none" title="Valid email format">
                            <Check className="w-4 h-4 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      {formData[field.id] && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(String(formData[field.id]).trim()) && (
                        <p className="text-[11px] text-red-500 dark:text-red-400 flex items-center gap-1 pl-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>Please enter a valid email address (e.g. name@gmail.com).</span>
                        </p>
                      )}
                    </div>
                  )}
                  
                  {field.type === 'PHONE' && (
                    <CountryPhoneInput
                      id={field.id}
                      name={field.name || field.id}
                      required={field.required}
                      placeholder={field.placeholder || '10-digit mobile number'}
                      value={formData[field.id] || ''}
                      companyCountry={form?.company?.country || form?.company?.countryCode}
                      error={fieldErrors[field.id]}
                      onChange={(val) => handleInputChange(field.id, val)}
                    />
                  )}

                  {field.type === 'NUMBER' && (
                    <div className="relative">
                      <input 
                        id={field.id}
                        type="number"
                        required={field.required}
                        placeholder={field.placeholder || '0'}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
                      />
                      <Hash className="w-4 h-4 text-zinc-400 absolute left-3 top-3 pointer-events-none" />
                    </div>
                  )}

                  {(field.type === 'DATE' || field.type === 'DATETIME') && (
                    <div className="relative">
                      <input 
                        id={field.id}
                        type={field.type === 'DATETIME' ? 'datetime-local' : 'date'}
                        required={field.required}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
                      />
                      <Calendar className="w-4 h-4 text-zinc-400 absolute left-3 top-3 pointer-events-none" />
                    </div>
                  )}
                  
                  {field.type === 'TEXTAREA' && (
                    <textarea 
                      id={field.id}
                      required={field.required}
                      placeholder={field.placeholder || ''}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all resize-y"
                    />
                  )}
                  
                  {field.type === 'SELECT' && (
                    <div className="relative">
                      <CustomSelect
                        id={field.id}
                        required={field.required}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className="w-full px-4 py-2.5 appearance-none bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-zinc-900 dark:text-zinc-100 transition-all"
                      >
                        <option value="" disabled>Select an option...</option>
                        {field.options?.map((option: string, i: number) => (
                          <option key={i} value={option}>{option}</option>
                        ))}
                      </CustomSelect>
                    </div>
                  )}
                  
                  {field.type === 'RADIO' && (
                    <div className="space-y-2.5 pt-1">
                      {field.options?.map((option: string, i: number) => (
                        <label key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors">
                          <input
                            type="radio"
                            id={`${field.id}-${i}`}
                            name={field.id}
                            value={option}
                            checked={formData[field.id] === option}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            required={field.required}
                            className="h-4 w-4 text-indigo-600 border-zinc-300 focus:ring-indigo-500"
                          />
                          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            {option}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  
                  {field.type === 'CHECKBOX' && (
                    <div className="space-y-2.5 pt-1">
                      {field.options?.map((option: string, i: number) => {
                        const isChecked = (formData[field.id] || []).includes(option);
                        return (
                          <label key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              id={`${field.id}-${i}`}
                              checked={isChecked}
                              onChange={(e) => handleCheckboxChange(field.id, option, e.target.checked)}
                              className="h-4 w-4 text-indigo-600 rounded border-zinc-300 focus:ring-indigo-500"
                            />
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                              {option}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {field.type === 'RATING' && (
                    <div className="flex items-center gap-2 py-2">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const active = (formData[field.id] || 0) >= star;
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleInputChange(field.id, star)}
                            className="p-1 rounded-lg hover:scale-110 transition-transform focus:outline-none"
                          >
                            <Star 
                              className={`w-7 h-7 ${active ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 dark:text-zinc-700'}`} 
                            />
                          </button>
                        );
                      })}
                      <span className="ml-2 text-xs text-zinc-400">
                        {formData[field.id] ? `${formData[field.id]} / 5 stars` : 'Select rating'}
                      </span>
                    </div>
                  )}

                  {field.type === 'FILE_UPLOAD' && (
                    <div className="mt-1">
                      <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl cursor-pointer bg-zinc-50/50 dark:bg-zinc-800/30 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-6 h-6 text-zinc-400 mb-1.5" />
                          <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium">
                            {fileData[field.id]?.name ? (
                              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{fileData[field.id].name}</span>
                            ) : (
                              <span>Click or drag to upload attachment</span>
                            )}
                          </p>
                        </div>
                        <input 
                          type="file" 
                          required={field.required && !fileData[field.id]}
                          onChange={(e) => handleFileUpload(field.id, e)}
                          className="hidden" 
                        />
                      </label>
                    </div>
                  )}
                </div>
              );
            })
          )}
          </div>
          
          {/* Navigation Controls (Back, Next, Submit) */}
          <div className="pt-8 mt-auto flex flex-col-reverse sm:flex-row items-center justify-between gap-3 sm:gap-4">
            {isMultiPage && !isFirstPage ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="w-full sm:w-auto px-5 py-3 rounded-xl font-semibold text-sm border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all flex items-center justify-center gap-1.5 order-2 sm:order-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
            ) : <div className="hidden sm:block" />}

            {isMultiPage && !isLastPage ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold text-base sm:text-sm shadow-md hover:shadow-lg hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 sm:ml-auto order-1 sm:order-2"
                style={{ backgroundColor: primaryButtonColor, color: primaryTextColor }}
              >
                <span>Continue to Step {currentPageIndex + 2}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button 
                type="submit" 
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-base sm:text-sm shadow-md hover:shadow-lg hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 sm:ml-auto order-1 sm:order-2"
                disabled={isSubmitting}
                style={{ backgroundColor: primaryButtonColor, color: primaryTextColor }}
              >
                {isSubmitting ? (
                  <>
                    <LogoLoader size={16} className="w-4 h-4 animate-spin text-current" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>{submitText}</span>
                )}
              </button>
            )}
          </div>
        </form>

        {/* Optional Footer Banner Image */}
        {footerImageUrl && (
          <div className="w-full max-h-56 overflow-hidden border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800">
            <img 
              src={footerImageUrl} 
              alt="Footer banner" 
              className="w-full h-auto max-h-56 object-cover" 
            />
          </div>
        )}

        {/* Optional Footer Note / Disclaimer / Privacy Note */}
        {footerText && (
          <div className="px-5 py-4 sm:px-8 sm:py-4 bg-zinc-50/70 dark:bg-zinc-850/50 border-t border-zinc-100 dark:border-zinc-800/80 text-center">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed">
              {footerText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
