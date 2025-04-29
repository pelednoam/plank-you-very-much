import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="py-4 px-4 md:px-8 border-t bg-background">
      <div className="container mx-auto text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Plank You Very Much. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer; 