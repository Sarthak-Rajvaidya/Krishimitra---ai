import enum

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, Table, Column, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class RoleName(str, enum.Enum):
    FARMER = "FARMER"
    ADMIN = "ADMIN"
    FINANCE = "FINANCE"
    DEVELOPER = "DEVELOPER"
    FOUNDER = "FOUNDER"


role_permissions = Table(
    "role_permissions", Base.metadata,
    Column("role_id", ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)


class Permission(Base):
    __tablename__ = "permissions"
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    description: Mapped[str] = mapped_column(String(255), default="")


class Role(Base):
    __tablename__ = "roles"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[RoleName] = mapped_column(Enum(RoleName), unique=True)
    permissions: Mapped[list[Permission]] = relationship(secondary=role_permissions, lazy="selectin")


class User(Base, TimestampMixin):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(160))
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    language: Mapped[str] = mapped_column(String(5), default="en")
    role: Mapped[Role] = relationship(lazy="joined")
    profile: Mapped["FarmerProfile | None"] = relationship(back_populates="user", uselist=False)


class FarmerProfile(Base, TimestampMixin):
    __tablename__ = "farmer_profiles"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    village: Mapped[str | None] = mapped_column(String(120))
    district: Mapped[str | None] = mapped_column(String(120), index=True)
    state: Mapped[str | None] = mapped_column(String(80))
    primary_crops: Mapped[str | None] = mapped_column(String(255))
    farm_size_acres: Mapped[float | None] = mapped_column()
    user: Mapped[User] = relationship(back_populates="profile")


class Address(Base, TimestampMixin):
    __tablename__ = "addresses"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    label: Mapped[str] = mapped_column(String(40), default="Home")
    line1: Mapped[str] = mapped_column(String(255))
    village: Mapped[str | None] = mapped_column(String(120))
    district: Mapped[str] = mapped_column(String(120))
    state: Mapped[str] = mapped_column(String(80))
    pincode: Mapped[str] = mapped_column(String(6), index=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)


class ServiceablePincode(Base):
    __tablename__ = "serviceable_pincodes"
    __table_args__ = (UniqueConstraint("pincode", "location_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    pincode: Mapped[str] = mapped_column(String(6), index=True)
    location_id: Mapped[int] = mapped_column(ForeignKey("inventory_locations.id"))
    delivery_fee_paise: Mapped[int] = mapped_column(Integer, default=0)
