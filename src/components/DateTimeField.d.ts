import { ComponentType } from 'react';

export const DateTimeField: ComponentType<{
  value: Date;
  onChange: (value: Date) => void;
  minimumDate?: Date;
  label: string;
}>;
