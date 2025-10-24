import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"

export default function ThankYouPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-200 rounded-full blur-2xl opacity-30"></div>
              <CheckCircle2 className="w-24 h-24 text-amber-600 relative" strokeWidth={1.5} />
            </div>
          </div>

          <h1 className="text-5xl md:text-6xl font-serif text-gray-900 mb-4 text-balance">Thank You</h1>

          <p className="text-xl text-gray-600 mb-2 font-light">We truly appreciate your support</p>

          <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
            Your message has been received and we'll get back to you as soon as possible. In the meantime, feel free to
            explore more about what we offer.
          </p>
        </div>

        {/* Content Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white rounded-lg p-8 border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">What's Next?</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              We're reviewing your submission and will reach out within 24-48 hours with next steps and any additional
              information we might need.
            </p>
          </div>

          <div className="bg-white rounded-lg p-8 border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Stay Connected</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Follow us on social media for updates, insights, and exclusive content. We'd love to stay in touch with
              you.
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            asChild
            className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-6 text-base rounded-lg font-medium transition-colors"
          >
            <a href="/">Return Home</a>
          </Button>

          <Button
            variant="outline"
            className="border-amber-200 text-amber-600 hover:bg-amber-50 px-8 py-6 text-base rounded-lg font-medium bg-transparent"
          >
            Explore More
          </Button>
        </div>

        {/* Footer Message */}
        <div className="mt-16 pt-8 border-t border-amber-100 text-center">
          <p className="text-sm text-gray-500">
            Questions? <span className="text-amber-600 font-medium">Contact us</span> anytime
          </p>
        </div>
      </div>
    </main>
  )
}
