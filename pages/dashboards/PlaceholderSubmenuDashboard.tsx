import React from 'react';
import type { LucideIcon } from 'lucide-react';
import ModuleDashboardLayout from '../../components/dashboard/ModuleDashboardLayout';
import { txt } from '../../lib/text';

interface PlaceholderSubmenuDashboardProps {
  nameKey: string;
  icon: LucideIcon;
}

const PlaceholderSubmenuDashboard: React.FC<PlaceholderSubmenuDashboardProps> = ({ nameKey, icon }) => (
  <ModuleDashboardLayout groups={[]} submenuTitle={txt(nameKey)} submenuIcon={icon} />
);

export default PlaceholderSubmenuDashboard;
