import React from 'react';
import ProfessionalDrumSequencer from './ProfessionalDrumSequencer';

interface RealSequencerInOverlayProps {
  onCartAdd: (packName: string) => void;
}

const RealSequencerInOverlay: React.FC<RealSequencerInOverlayProps> = ({ onCartAdd }) => {
  return (
    <div className="w-full h-full overflow-auto">
      {/* Container für den echten Sequencer */}
      <div className="min-h-full">
        <ProfessionalDrumSequencer />
      </div>
    </div>
  );
};

export default RealSequencerInOverlay;