import { cloneElement, useState, type AriaAttributes, type ReactElement } from 'react';
import { Dropdown, type DropdownProps } from 'antd';

type MenuTriggerProps = Pick<AriaAttributes, 'aria-expanded' | 'aria-haspopup' | 'aria-label'>;

export type AccessibleDropdownProps = Omit<DropdownProps, 'children' | 'open'> & {
  label: string;
  children: ReactElement<MenuTriggerProps>;
};

export function AccessibleDropdown({ children, label, onOpenChange, ...props }: AccessibleDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dropdown
      {...props}
      open={open}
      onOpenChange={(nextOpen, info) => {
        setOpen(nextOpen);
        onOpenChange?.(nextOpen, info);
      }}
    >
      {cloneElement(children, {
        'aria-expanded': open,
        'aria-haspopup': 'menu',
        'aria-label': label
      })}
    </Dropdown>
  );
}
