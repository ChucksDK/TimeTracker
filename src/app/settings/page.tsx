'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { profileService } from '@/lib/database'
import { Profile } from '@/types'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getCurrencyOptions, getCurrencySymbol, Currency } from '@/lib/currency'
import { Header } from '@/components/Header'

const profileSchema = z.object({
  email: z.string().email(),
  company_name: z.string().optional(),
  internal_hourly_rate: z.number().min(0).optional(),
  currency: z.enum(['USD', 'EUR', 'DKK']).optional(),
  business_address: z.string().optional(),
  business_phone: z.string().optional(),
  business_vat_number: z.string().optional(),
  business_email: z.string().email('Invalid email format').optional().or(z.literal('')),
})

type ProfileFormData = z.infer<typeof profileSchema>

export default function SettingsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  })

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  const selectedCurrency = watch('currency') as Currency
  const currencyOptions = getCurrencyOptions()

  const loadProfile = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const data = await profileService.get(user.id)
      setProfile(data)
      reset({
        email: data.email,
        company_name: data.company_name || '',
        internal_hourly_rate: data.internal_hourly_rate || 0,
        currency: data.currency || 'USD',
        business_address: data.business_address || '',
        business_phone: data.business_phone || '',
        business_vat_number: data.business_vat_number || '',
        business_email: data.business_email || '',
      })
    } catch (err: any) {
      setError(err.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return
    
    setSaving(true)
    setError(null)
    setSuccess(false)
    
    try {
      await profileService.update(user.id, {
        company_name: data.company_name || null,
        internal_hourly_rate: data.internal_hourly_rate || null,
        currency: data.currency || 'USD',
        business_address: data.business_address || null,
        business_phone: data.business_phone || null,
        business_vat_number: data.business_vat_number || null,
        business_email: data.business_email || null,
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Loading profile...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                Profile updated successfully!
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  {...register('email')}
                  type="email"
                  disabled
                  className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-500 cursor-not-allowed"
                />
                <p className="mt-1 text-sm text-gray-500">Email cannot be changed</p>
              </div>

              <div>
                <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
                  Company Name
                </label>
                <input
                  {...register('company_name')}
                  type="text"
                  placeholder="Your Company Ltd."
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.company_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.company_name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
                  Currency
                </label>
                <select
                  {...register('currency')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {currencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.currency && (
                  <p className="mt-1 text-sm text-red-600">{errors.currency.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="internal_hourly_rate" className="block text-sm font-medium text-gray-700">
                  Internal Hourly Rate
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">{getCurrencySymbol(selectedCurrency || 'USD')}</span>
                  </div>
                  <input
                    {...register('internal_hourly_rate', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-7 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Your internal cost per hour. Used for EBITDA calculations.
                </p>
                {errors.internal_hourly_rate && (
                  <p className="mt-1 text-sm text-red-600">{errors.internal_hourly_rate.message}</p>
                )}
              </div>

              {/* Business Information Section */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
                <p className="text-sm text-gray-500 mb-6">This information will appear on your invoices</p>
                
                <div className="space-y-6">
                  <div>
                    <label htmlFor="business_address" className="block text-sm font-medium text-gray-700">
                      Business Address
                    </label>
                    <textarea
                      {...register('business_address')}
                      rows={3}
                      placeholder="123 Business Street&#10;Suite 100&#10;City, State 12345"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.business_address && (
                      <p className="mt-1 text-sm text-red-600">{errors.business_address.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="business_phone" className="block text-sm font-medium text-gray-700">
                        Business Phone
                      </label>
                      <input
                        {...register('business_phone')}
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {errors.business_phone && (
                        <p className="mt-1 text-sm text-red-600">{errors.business_phone.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="business_email" className="block text-sm font-medium text-gray-700">
                        Business Email
                      </label>
                      <input
                        {...register('business_email')}
                        type="email"
                        placeholder="billing@yourcompany.com"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {errors.business_email && (
                        <p className="mt-1 text-sm text-red-600">{errors.business_email.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="business_vat_number" className="block text-sm font-medium text-gray-700">
                      VAT Number
                    </label>
                    <input
                      {...register('business_vat_number')}
                      type="text"
                      placeholder="GB123456789"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.business_vat_number && (
                      <p className="mt-1 text-sm text-red-600">{errors.business_vat_number.message}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Account Information</h3>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="inline font-medium text-gray-500">User ID:</dt>
                    <dd className="inline ml-2 text-gray-900">{user?.id}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-gray-500">Created:</dt>
                    <dd className="inline ml-2 text-gray-900">
                      {profile && new Date(profile.created_at).toLocaleDateString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-gray-500">Last Updated:</dt>
                    <dd className="inline ml-2 text-gray-900">
                      {profile && new Date(profile.updated_at).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </div>
      </main>
    </div>
  )
}