import React from 'react';
import { txt } from '../lib/text';
import { Bell, Wrench } from 'lucide-react';
import Section from '../components/shared/Section';

const NotificationPage: React.FC = () => {
  return (
    <div className="min-h-full bg-card rounded-xl border border-border shadow-sm p-4 md:p-5">
      <Section
        title={txt('notification.title')}
        icon={<Bell size={16} className="text-primary" />}
      >
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4 dark:bg-amber-500/15 dark:text-amber-300">
            <Wrench size={30} strokeWidth={2} />
          </div>
          <p className="text-base font-semibold text-foreground">
            {txt('notification.demoBannerTitle')}
          </p>
          <p className="text-sm text-muted-foreground leading-snug mt-2 max-w-md">
            {txt('notification.demoBannerDesc')}
          </p>
        </div>
      </Section>
    </div>
  );
};

export default NotificationPage;
