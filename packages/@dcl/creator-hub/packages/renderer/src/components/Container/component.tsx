import './styles.css';

export function Container(props: React.PropsWithChildren) {
  return <div className="Container">{props.children}</div>;
}
