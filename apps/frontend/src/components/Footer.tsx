export const Footer = () => {
    return (
      <footer className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 z-10 border-t border-slate-800/50 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-400 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/25">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-white">Exchange</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                The next-generation crypto exchange platform built for traders, by
                traders.
              </p>
            </div>
  
            <div>
              <h3 className="text-white font-semibold mb-6">Products</h3>
              <ul className="space-y-3">
                {["Spot Trading", "Futures", "Staking", "API"].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-slate-400 hover:text-red-400 transition-colors text-sm"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
  
            <div>
              <h3 className="text-white font-semibold mb-6">Company</h3>
              <ul className="space-y-3">
                {["About Us", "Blog", "Careers", "Press"].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-slate-400 hover:text-red-400 transition-colors text-sm"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
  
            <div>
              <h3 className="text-white font-semibold mb-6">Support</h3>
              <ul className="space-y-3">
                {["Help Center", "Contact Us", "Status", "Docs"].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-slate-400 hover:text-red-400 transition-colors text-sm"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
  
          <div className="border-t border-slate-800/50 mb-8"></div>
  
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-slate-500 text-sm">
              © {new Date().getFullYear()} Exchange. All rights reserved.
            </p>
  
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                <a
                  href="#"
                  className="text-slate-400 hover:text-red-400 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8.29 20v-7.21H5.33V9.25h2.96V7.46c0-2.964 1.81-4.573 4.447-4.573 1.265 0 2.354.094 2.671.137v3.1h-1.834c-1.44 0-1.718.685-1.718 1.69v2.213h3.435l-.447 3.54h-2.988V20" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="text-slate-400 hover:text-red-400 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="text-slate-400 hover:text-red-400 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-2 16.413h-3v-9h3v9zm-1.5-10.25c-.966 0-1.75-.784-1.75-1.75s.784-1.75 1.75-1.75 1.75.784 1.75 1.75-.784 1.75-1.75 1.75zM17 16.413h-3v-4.35c0-1.037-.019-2.37-1.446-2.37-1.448 0-1.668 1.13-1.668 2.3v4.42h-3v-9h2.88v1.23h.04c.402-.761 1.383-1.562 2.847-1.562 3.046 0 3.608 2.003 3.608 4.612v4.72z" />
                  </svg>
                </a>
              </div>
  
              <div className="flex items-center gap-6">
                <a
                  href="#"
                  className="text-slate-400 hover:text-red-400 transition-colors text-sm"
                >
                  Privacy Policy
                </a>
                <a
                  href="#"
                  className="text-slate-400 hover:text-red-400 transition-colors text-sm"
                >
                  Terms of Service
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    );
  };
  