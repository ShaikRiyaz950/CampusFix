import {
  GraduationCap,
  FlaskConical,
  Zap,
  Droplets,
  Bath,
  Sparkles,
  Armchair,
  Building2,
  Wifi,
  Ellipsis,
} from 'lucide-react'

export const categoryIcons = {
  Classroom: GraduationCap,
  Laboratory: FlaskConical,
  Electricity: Zap,
  'Drinking Water': Droplets,
  Washroom: Bath,
  Cleanliness: Sparkles,
  Furniture: Armchair,
  Infrastructure: Building2,
  Internet: Wifi,
  Other: Ellipsis,
}

function CategoryIcon({ name, selected = false, size = 22 }) {
  const Icon = categoryIcons[name] || Ellipsis
  return (
    <span className={`category-icon-lucide ${selected ? 'selected' : ''}`} aria-hidden="true">
      <Icon size={size} strokeWidth={1.9} />
    </span>
  )
}

export default CategoryIcon
