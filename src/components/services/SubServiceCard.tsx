import { motion } from 'framer-motion';
import { Clock, IndianRupee, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubService } from '@/data/servicesData';

interface SubServiceCardProps {
  subService: SubService;
  serviceColor: string;
  serviceBgColor: string;
  onSelect: (subService: SubService) => void;
  isSelected: boolean;
}

export const SubServiceCard = ({
  subService,
  serviceColor,
  serviceBgColor,
  onSelect,
  isSelected,
}: SubServiceCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`relative bg-card rounded-2xl p-6 shadow-soft hover:shadow-elevated transition-all duration-300 cursor-pointer border-2 ${
        isSelected ? 'border-primary' : 'border-transparent'
      }`}
      onClick={() => onSelect(subService)}
    >
      {/* Selected indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-4 right-4 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
        >
          <Check className="w-4 h-4 text-primary-foreground" />
        </motion.div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-12 h-12 ${serviceBgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${serviceColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground mb-1 truncate">
            {subService.name}
          </h3>
          <p className="text-muted-foreground text-sm line-clamp-2">
            {subService.description}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5 text-sm">
          <IndianRupee className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground">{subService.priceRange}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <Clock className="w-4 h-4 text-secondary" />
          <span className="text-muted-foreground">{subService.duration}</span>
        </div>
      </div>

      {/* CTA */}
      <Button
        variant={isSelected ? 'default' : 'outline'}
        className="w-full"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(subService);
        }}
      >
        {isSelected ? 'Selected' : 'Select Service'}
      </Button>
    </motion.div>
  );
};
