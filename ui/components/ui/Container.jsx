/**
 * Horizontal page container with responsive gutters.
 *
 * @param {{ as?: keyof JSX.IntrinsicElements, className?: string, children: React.ReactNode }} props
 */
export default function Container({ as: Component = "div", className = "", children }) {
  return (
    <Component className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`.trim()}>
      {children}
    </Component>
  );
}
