import { BookOpen, Building2, GraduationCap, Hash, LayoutDashboard, MapPin, Shield, UserRound, UsersRound } from "lucide-react";

export const adminTabs = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/profile", label: "Profile", icon: UserRound },
];

export const adminSections = [
  {
    key: "faculties",
    singular: "faculty",
    label: "Faculties",
    icon: Building2,
    path: "/admin/faculties",
    listKey: "faculties",
    titleField: "name",
    deletePath: (id) => `/admin/faculties/${id}`,
    fields: [{ name: "name", label: "Faculty name", type: "text" }],
  },
  {
    key: "departments",
    singular: "department",
    label: "Departments",
    icon: GraduationCap,
    path: "/admin/departments",
    listKey: "departments",
    titleField: "name",
    deletePath: (id) => `/admin/departments/${id}`,
    fields: [
      { name: "name", label: "Department name", type: "text" },
      { name: "faculty_id", label: "Faculty", type: "select", source: "faculties" },
    ],
  },
  {
    key: "department-matric-codes",
    singular: "code",
    label: "Codes",
    icon: Hash,
    path: "/admin/department-matric-codes",
    listKey: "department_matric_codes",
    titleField: "code",
    deletePath: (id) => `/admin/department-matric-codes/${id}`,
    fields: [
      { name: "department_id", label: "Department", type: "select", source: "departments" },
      { name: "code", label: "Matric code", type: "text" },
    ],
  },
  {
    key: "venues",
    singular: "venue",
    label: "Venues",
    icon: MapPin,
    path: "/admin/venues",
    listKey: "venues",
    titleField: "name",
    deletePath: (id) => `/admin/venues/${id}`,
    fields: [
      { name: "name", label: "Venue name", type: "text" },
      { name: "location", label: "Location", type: "text" },
      { name: "capacity", label: "Capacity", type: "number" },
    ],
  },
  {
    key: "lecturers",
    singular: "lecturer",
    label: "Lecturers",
    icon: UsersRound,
    path: "/admin/lecturers",
    listKey: "lecturers",
    titleField: "name",
    deletePath: (id) => `/admin/lecturers/${id}`,
    fields: [
      { name: "name", label: "Lecturer name", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "password", label: "Password", type: "password" },
      { name: "department_id", label: "Department", type: "select", source: "departments" },
    ],
  },
  {
    key: "courses",
    singular: "course",
    label: "Courses",
    icon: BookOpen,
    path: "/admin/courses",
    listKey: "courses",
    titleField: "course_code",
    deletePath: (id) => `/admin/courses/${id}`,
    fields: [
      { name: "course_code", label: "Course code", type: "text" },
      { name: "title", label: "Title", type: "text" },
      { name: "department_id", label: "Department", type: "select", source: "departments" },
      { name: "level", label: "Level", type: "select", options: [100, 200, 300, 400, 500, 600] },
      { name: "semester", label: "Semester", type: "select", options: [1, 2] },
      { name: "type", label: "Type", type: "select", options: ["core", "elective"], defaultValue: "core" },
      { name: "academic_year", label: "Academic year", type: "text", defaultValue: "2025/2026" },
    ],
  },
  {
    key: "admins",
    singular: "admin",
    label: "Admins",
    icon: Shield,
    path: "/admin/admins",
    listKey: "admins",
    titleField: "name",
    fields: [
      { name: "name", label: "Admin name", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "password", label: "Password", type: "password" },
    ],
  },
];

export function subtitleFor(item) {
  return item.department_name || item.faculty_name || item.email || item.location || item.title || "Active record";
}
