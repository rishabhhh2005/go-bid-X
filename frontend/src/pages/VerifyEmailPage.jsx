import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'

import {
    resendOtpRequest,
} from '../services/appService'

import { useAuth } from '../hooks/useAuth'

import logo from '../assets/logo.png'

export default function VerifyEmailPage() {

    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const location = useLocation()
    const { verify } = useAuth()

    const inputRefs = useRef([])

    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState(['', '', '', '', '', ''])

    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const [loading, setLoading] = useState(false)
    const [resending, setResending] = useState(false)

    useEffect(() => {
        const queryEmail = searchParams.get('email')
        if (queryEmail) {
            setEmail(queryEmail)
        }
    }, [searchParams])

    const handleOtpChange = (value, index) => {
        if (!/^\d?$/.test(value)) {
            return
        }
        const updatedOtp = [...otp]
        updatedOtp[index] = value
        setOtp(updatedOtp)
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus()
        }
    }

    const handleKeyDown = (event, index) => {
        if (
            event.key === 'Backspace' &&
            !otp[index] &&
            index > 0
        ) {
            inputRefs.current[index - 1]?.focus()
        }
    }

    const handleVerify = async (event) => {
        event.preventDefault()
        setError('')
        setSuccess('')

        const finalOtp = otp.join('')

        if (!email.trim()) {
            setError('Email is required.')
            return
        }

        if (finalOtp.length !== 6) {
            setError('Please enter the complete 6-digit OTP.')
            return
        }

        setLoading(true)

        try {
            await verify({
                email,
                otp: finalOtp,
            })

            setSuccess('Email verified successfully. Redirecting to dashboard...')

            setTimeout(() => {
                navigate('/dashboard', { replace: true })
            }, 1500)

        } catch (err) {
            const detail =
                err?.response?.data?.detail || 'Verification failed.'
            setError(detail)
        } finally {
            setLoading(false)
        }
    }

    const handleResendOtp = async () => {
        setError('')
        setSuccess('')

        if (!email.trim()) {
            setError('Email is required.')
            return
        }

        setResending(true)

        try {
            await resendOtpRequest({ email })
            setOtp(['', '', '', '', '', ''])
            inputRefs.current[0]?.focus()
            setSuccess('A new OTP has been sent successfully.')
        } catch (err) {
            const detail =
                err?.response?.data?.detail || 'Failed to resend OTP.'
            setError(detail)
        } finally {
            setResending(false)
        }
    }

    return (
        <div className="min-h-screen relative overflow-hidden bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-brand-300/20 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-300/20 blur-[120px] pointer-events-none" />

            <div className="max-w-md w-full space-y-8 glass-panel p-10 relative z-10 animate-fade-in shadow-2xl">
                <div className="text-center">
                    <div className="mx-auto mb-6 flex justify-center">
                        <img
                            src={logo}
                            alt="GoBidX"
                            className="h-16 w-auto object-contain"
                        />
                    </div>
                    <h1 className="text-4xl font-display font-bold text-slate-900 tracking-tight">
                        Verify Your Email
                    </h1>
                    <p className="mt-4 text-base text-slate-600 leading-relaxed">
                        A verification code has been sent to
                        <span className="font-semibold text-slate-800">
                            {' '}{email || 'your email'}
                        </span>
                        .
                        <br />
                        Please check your inbox and enter the 6-digit OTP below.
                    </p>
                </div>

                <form
                    onSubmit={handleVerify}
                    className="mt-10 space-y-6"
                >
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-4">
                                Verification Code
                            </label>
                            <div className="flex justify-between gap-2">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={(element) => {
                                            inputRefs.current[index] = element
                                        }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(event) =>
                                            handleOtpChange(
                                                event.target.value,
                                                index
                                            )
                                        }
                                        onKeyDown={(event) =>
                                            handleKeyDown(event, index)
                                        }
                                        className="
                      w-14 h-16
                      text-center
                      text-2xl
                      font-bold
                      rounded-2xl
                      border-2
                      border-slate-200
                      bg-white
                      focus:border-brand-500
                      focus:ring-4
                      focus:ring-brand-100
                      outline-none
                      transition-all
                      duration-200
                      shadow-sm
                    "
                                    />
                                ))}
                            </div>
                            <p className="mt-3 text-xs text-slate-500 text-center">
                                OTP expires in 5 minutes.
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-xl p-4 border bg-red-50 border-red-200 text-red-700 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="rounded-xl p-4 border bg-green-50 border-green-200 text-green-700 text-sm font-medium">
                            {success}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-primary py-4 text-base"
                    >
                        {loading ? 'Verifying...' : 'Verify Email'}
                    </button>
                </form>

                <button
                    onClick={handleResendOtp}
                    disabled={resending}
                    className="w-full mt-3 text-brand-600 hover:text-brand-700 font-semibold transition-colors"
                >
                    {resending ? 'Resending OTP...' : 'Resend OTP'}
                </button>

                <p className="mt-8 text-center text-sm font-medium text-slate-600">
                    Already verified?{' '}
                    <Link
                        to="/login"
                        className="text-brand-600 hover:text-brand-700 font-bold hover:underline transition-all"
                    >
                        Login
                    </Link>
                </p>
            </div>
        </div>
    )
}
