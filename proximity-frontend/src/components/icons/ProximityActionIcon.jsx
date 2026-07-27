import { getProximityActionIcon } from './proximityIconRegistry'

export default function ProximityActionIcon({
  name,
  size = 18,
  stroke = 1.8,
  ...props
}) {
  const Icon = getProximityActionIcon(name)

  if (!Icon) {
    return null
  }

  return (
    <Icon
      size={size}
      stroke={stroke}
      aria-hidden="true"
      {...props}
    />
  )
}
