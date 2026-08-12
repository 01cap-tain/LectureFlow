import { NavLink } from "react-router-dom";
import { LayoutDashboard, UserRound } from "lucide-react";
import logo from "../assets/LogoMakr-8frzfc.png";

export function MobileShell({
  children,
  title = "LectureFlow",
  tabs = [],
  homeTo = "/admin/dashboard",
  profileTo = "/admin/profile",
  navLabel = "App navigation",
}) {
  return (
    <div className="phone-shell">
      <header className="app-header">
        <NavLink to={homeTo} className="brand" aria-label="LectureFlow home">
          <span className="brand-mark"><img src={logo} alt="" /></span>
          <span>{title}</span>
        </NavLink>
        <NavLink to={profileTo} className="icon-button" aria-label="Profile">
          <UserRound size={19} />
        </NavLink>
      </header>

      <main className="app-main">{children}</main>

      <nav className="bottom-tabs" aria-label={navLabel}>
        {tabs.map((tab) => {
          const Icon = tab.icon || LayoutDashboard;
          return (
            <NavLink key={tab.to} to={tab.to} className="tab-link">
              <Icon size={19} />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
