import React, { type FC } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Icon, type IconifyIcon } from "@iconify/react";

export const navItemBaseStyles =
  "hover:bg-muted-100 hover:text-primary-500 dark:hover:bg-muted-800 leading-6 text-muted-500 dark:text-muted-400 relative flex cursor-pointer items-center gap-1 rounded-lg py-2 px-3";

interface NavbarItemProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "className"> {
  icon: IconifyIcon | string;
  title: string;
  href?: string;
}
const NavbarItem: FC<NavbarItemProps> = ({
  icon,
  title,
  href = "",
  ...props
}) => {
  const router = useRouter();

  const isActive = router.pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 transition-colors duration-300 ${navItemBaseStyles} ${
        isActive
          ? "bg-muted-100 text-primary-500 dark:bg-muted-800 lg:bg-transparent "
          : ""
      }`}
      {...props}
    >
      <Icon icon={icon} className="h-5 w-5" />
      <span className="text-sm">{title}</span>
    </Link>
  );
};

export default NavbarItem;
