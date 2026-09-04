export interface ISelectOption {
  value: string;
  label: string;
}

export interface ISelectGroup {
  label: string;
  options: ISelectOption[];
}

export interface ISelectProps {
  options: ISelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}
