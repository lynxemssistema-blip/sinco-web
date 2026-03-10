import {
    LayoutDashboard, Building2, Calendar, FileText,
    ShieldCheck, HardHat, ClipboardCheck, Settings,
    Ruler, FolderTree, Paintbrush,
    Package, FolderKanban, Boxes, ClipboardList, Factory,
    Folder, FolderOpen, Circle, Star, Users, Briefcase,
    Truck, Archive, Hammer, Shield, Zap, Menu, Grid, Camera, FilePlus,
    FolderUp, FileCheck, FileX, RefreshCw, Trash2, XCircle, FileSpreadsheet, CheckCircle, ArrowLeftCircle,
    BarChart3, ShieldAlert, Database
} from 'lucide-react';

export const iconMap: Record<string, any> = {
    LayoutDashboard,
    Calendar,
    Building2,
    Ruler,
    FolderTree,
    Paintbrush,
    Package,
    FolderKanban,
    Boxes,
    ClipboardList,
    Factory,
    FileText,
    ShieldCheck,
    HardHat,
    ClipboardCheck,
    Settings,
    Folder,
    FolderOpen,
    Users,
    Briefcase,
    Truck,
    Archive,
    Hammer,
    Shield,
    Zap,
    Star,
    Menu,
    Grid,
    Camera,
    FilePlus,
    FolderUp,
    FileCheck,
    FileX,
    RefreshCw,
    Trash2,
    XCircle,
    FileSpreadsheet,
    CheckCircle,
    ArrowLeftCircle,
    BarChart3,
    ShieldAlert,
    Database,
};

export const getIcon = (name: string) => {
    return iconMap[name] || Circle;
};

// Interface for Menu Items
export interface MenuItem {
    id: string;
    label: string;
    icon: string;
    href?: string; // If it's a link
    children?: MenuItem[]; // If it's a group
    isOpen?: boolean; // For UI state (not persisted usually, but maybe default open?)
}
