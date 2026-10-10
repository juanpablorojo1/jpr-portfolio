/* Logo A «Asta» (elegido por Juan el 2026-10-10: «A, menú así»).
   Fuente: clients/jpr-portfolio/logo/sistema-a/nav-animable.svg — mismo dibujo que nav.svg, píxel a píxel,
   con las piezas separadas para animarlas después (motion-designer): #jpr-letras > #jpr-asta, #jpr-panza,
   #jpr-gancho, y #jpr-pierna (trazo recortado por #jpr-base en la línea base, para dibujarlo de arriba abajo).
   Letras en currentColor; la pierna de la R es el único rojo (#E8272A). No recolorear, no sumar efectos.
   Hay dos instancias (barra y menú de celular): la barra lleva los ids canónicos y la otra los lleva con
   sufijo, así no hay ids duplicados y el clip-path de cada una apunta a su propio <clipPath>. */

type Props = {
  /** Sufijo de los ids. Vacío = ids canónicos (la instancia de la barra). */
  idSuffix?: string;
};

export default function LogoMark({ idSuffix = '' }: Props) {
  const id = (name: string) => `jpr-${name}${idSuffix}`;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 106 101" focusable="false" aria-hidden="true">
      <defs>
        <clipPath id={id('base')}>
          <rect width="120" height="110" y="-10" />
        </clipPath>
      </defs>
      <path
        id={id('pierna')}
        className="jpr-pierna"
        fill="none"
        stroke="#e8272a"
        strokeWidth="18.78"
        d="M70.5 50 98 105"
        clipPath={`url(#${id('base')})`}
      />
      <g id={id('letras')} fill="currentColor">
        <path id={id('asta')} d="M36 0h20v74H36Z" />
        <path
          id={id('panza')}
          d="M36 0h35a27 27 0 0 1 27 27v4a27 27 0 0 1-27 27H36Zm20 17v24h12a9 9 0 0 0 9-9v-6a9 9 0 0 0-9-9Z"
        />
        <path
          id={id('gancho')}
          d="M56 73v2a26 26 0 0 1-26 26h-4A26 26 0 0 1 0 75V64h19v12a8 8 0 0 0 8 8h1a8 8 0 0 0 8-8v-3Z"
        />
      </g>
    </svg>
  );
}
