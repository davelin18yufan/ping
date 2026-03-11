import { createFileRoute, Link } from "@tanstack/react-router"
import { MessageCircle, Zap, Users, Shield, Sparkles, ArrowRight } from "lucide-react"

export const Route = createFileRoute("/")({
    component: LandingPage,
})

/**
 * Landing page for non-authenticated users
 * Public product page showcasing Ping features
 */
function LandingPage() {
    const features = [
        {
            icon: <MessageCircle className="w-12 h-12 text-blue-400" />,
            title: "Instant Messaging",
            description:
                "Real-time conversations with friends and family. Fast, reliable, always connected.",
        },
        {
            icon: <Users className="w-12 h-12 text-blue-400" />,
            title: "Group Chats",
            description:
                "Create rooms, invite friends, and chat together. Perfect for communities and teams.",
        },
        {
            icon: <Shield className="w-12 h-12 text-blue-400" />,
            title: "Secure & Private",
            description:
                "End-to-end encryption, secure OAuth login. Your conversations stay private.",
        },
        {
            icon: <Zap className="w-12 h-12 text-blue-400" />,
            title: "Lightning Fast",
            description: "Powered by modern tech stack. Instant message delivery, no lag.",
        },
        {
            icon: <Sparkles className="w-12 h-12 text-blue-400" />,
            title: "Beautiful Design",
            description:
                "Elegant dark mode, smooth animations. A messaging experience you'll love.",
        },
    ]

    return (
        <div className="min-h-screen bg-linear-to-b from-slate-900 via-slate-800 to-slate-900">
            {/* Hero Section */}
            <section className="relative py-20 px-6 text-center overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10"></div>
                <div className="relative max-w-5xl mx-auto">
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <MessageCircle className="w-16 h-16 md:w-20 md:h-20 text-blue-400" />
                        <h1 className="text-6xl md:text-7xl font-black text-white">
                            <span className="bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                Ping
                            </span>
                        </h1>
                    </div>
                    <p className="text-2xl md:text-3xl text-gray-300 mb-4 font-light">
                        Instant connection, lasting moments
                    </p>
                    <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-8">
                        Modern messaging for everyone. Connect with friends, share moments, and stay
                        in touch — all in one beautiful, secure platform.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            to="/auth"
                            className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-blue-500/50 flex items-center gap-2"
                        >
                            Get Started <ArrowRight className="w-4 h-4" />
                        </Link>
                        <a
                            href="#features"
                            className="px-8 py-3 border border-gray-600 hover:border-blue-500 text-gray-300 hover:text-white font-semibold rounded-lg transition-colors"
                        >
                            Learn More
                        </a>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-16 px-6 max-w-7xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
                    Why Choose Ping?
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
                        >
                            <div className="mb-4">{feature.icon}</div>
                            <h3 className="text-xl font-semibold text-white mb-3">
                                {feature.title}
                            </h3>
                            <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 px-6 text-center">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Ready to start chatting?
                    </h2>
                    <p className="text-lg text-gray-400 mb-8">
                        Join thousands of users already using Ping to stay connected.
                    </p>
                    <Link
                        to="/auth"
                        className="inline-flex items-center gap-2 px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-blue-500/50"
                    >
                        Sign In with OAuth <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </section>
        </div>
    )
}
