import React, { Dispatch, ReactNode, SetStateAction } from 'react';
import { defaultThemes } from './theme.config';
import { ThemeType, Theme } from './theme.model';

interface ThemeContextProps {
  themeType: ThemeType;
  theme: Theme,
  setCurrentTheme: Dispatch<SetStateAction<ThemeType>>
}

export const ThemeContext = React.createContext<ThemeContextProps>({
  themeType: 'default',
  theme: defaultThemes['default'],
} as ThemeContextProps);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = React.useState<ThemeType>('default');

  return (
    <ThemeContext.Provider value={{
      themeType: currentTheme,
      theme: defaultThemes[currentTheme],
      setCurrentTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => React.useContext(ThemeContext);