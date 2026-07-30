import React from "react";
import { Link } from "react-router-dom";
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Send,
  Stethoscope,
  Activity,
  Phone,
  Mail,
  MapPin
} from "lucide-react";
import logo from "../../assets/logo.png";
import { footerStyles } from "../../assets/dummyStyles";

const quickLinks = [
  { name: "Home", href: "/" },
  { name: "Doctors", href: "/doctors" },
  { name: "Services", href: "/services" },
  { name: "Contact", href: "/contact" },
  { name: "Appointments", href: "/appointments" },
];

const services = [
  { name: "Blood Pressure Check", href: "/services" },
  { name: "Blood Sugar Test", href: "/services" },
  { name: "Full Blood Count", href: "/services" },
  { name: "X-Ray Scan", href: "/services" },
];

const socialLinks = [
  {
    Icon: Facebook,
    color: footerStyles.facebookColor,
    name: "Facebook",
    href: "https://www.facebook.com/",
  },
  {
    Icon: Twitter,
    color: footerStyles.twitterColor,
    name: "Twitter",
    href: "https://twitter.com/",
  },
  {
    Icon: Instagram,
    color: footerStyles.instagramColor,
    name: "Instagram",
    href: "https://instagram.com/",
  },
  {
    Icon: Linkedin,
    color: footerStyles.linkedinColor,
    name: "Linkedin",
    href: "https://linkedin.com/",
  },
];

export default function Footer() {
  return (
    <footer className={footerStyles.footerContainer}>
      {/* Background ambient lighting effects */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Decorative Icons */}
      <div className={footerStyles.floatingIcon1}>
        <Stethoscope className={footerStyles.stethoscopeIcon} />
      </div>
      <div className={footerStyles.floatingIcon2}>
        <Activity className={footerStyles.activityIcon} />
      </div>

      <div className={footerStyles.mainContent}>
        <div className={footerStyles.gridContainer}>
          {/* Company Info */}
          <div className={footerStyles.companySection}>
            <div className={footerStyles.logoContainer}>
              <img src={logo} alt="MediCare" className="w-12 h-12 object-contain bg-white p-1.5 rounded-2xl border border-blue-200 shadow-sm" />
              <div>
                <span className={footerStyles.companyName}>MediCare</span>
                <span className={footerStyles.companyTagline}>Healthcare Redefined</span>
              </div>
            </div>
            <p className={footerStyles.companyDescription}>
              Connecting you with certified specialists and modern diagnostic scans 24/7.
            </p>

            <div className={footerStyles.contactContainer}>
              <div className={footerStyles.contactItem}>
                <div className={footerStyles.contactIconWrapper}>
                  <MapPin className={footerStyles.contactIcon} />
                </div>
                <span className={footerStyles.contactText}>Lucknow, Uttar Pradesh</span>
              </div>

              <div className={footerStyles.contactItem}>
                <div className={footerStyles.contactIconWrapper}>
                  <Phone className={footerStyles.contactIcon} />
                </div>
                <span className={footerStyles.contactText}>+91 522 XXX XXXX</span>
              </div>

              <div className={footerStyles.contactItem}>
                <div className={footerStyles.contactIconWrapper}>
                  <Mail className={footerStyles.contactIcon} />
                </div>
                <span className={footerStyles.contactText}>support@medicare.com</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className={footerStyles.linksSection}>
            <h3 className={footerStyles.sectionTitle}>Quick Links</h3>
            <ul className={footerStyles.linksList}>
              {quickLinks.map((link) => (
                <li key={link.name} className={footerStyles.linkItem}>
                  <Link to={link.href} className={footerStyles.quickLink}>
                    <span className="truncate">{link.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Medical Services */}
          <div className={footerStyles.linksSection}>
            <h3 className={footerStyles.sectionTitle}>Our Services</h3>
            <ul className={footerStyles.linksList}>
              {services.map((svc) => (
                <li key={svc.name} className={footerStyles.linkItem}>
                  <Link to={svc.href} className={footerStyles.serviceLink}>
                    <div className={footerStyles.serviceIcon} />
                    <span className="truncate">{svc.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter Section */}
          <div className={footerStyles.newsletterSection}>
            <h3 className={footerStyles.newsletterTitle}>Newsletter</h3>
            <p className={footerStyles.newsletterDescription}>
              Subscribe to stay updated with healthcare advice, news, and packages.
            </p>

            {/* Newsletter input */}
            <div className={footerStyles.desktopNewsletterContainer}>
              <input
                type="email"
                placeholder="Enter your email"
                className={footerStyles.desktopEmailInput}
              />
              <button className={footerStyles.desktopSubscribeButton}>
                <Send size={13} />
                <span>Subscribe</span>
              </button>
            </div>

            {/* Social icons */}
            <div className={footerStyles.socialContainer}>
              {socialLinks.map(({ Icon, name, href }) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={footerStyles.socialLink}
                  aria-label={name}
                >
                  <Icon className={footerStyles.socialIcon} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className={footerStyles.bottomSection}>
          <div className={footerStyles.copyright}>
            <span>&copy; {new Date().getFullYear()} MediCare Inc. All rights reserved.</span>
          </div>
          <div className={footerStyles.designerText}>
            <span>Designed with care for premium clinical environments.</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </footer>
  );
}
