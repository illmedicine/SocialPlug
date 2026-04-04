# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  SocialPlug — Azure Terraform Configuration (3 Free-Tier VMs)             ║
# ║  by Illy Robotic Instruments                                               ║
# ╚══════════════════════════════════════════════════════════════════════════════╝
#
# Creates: 1 Resource Group, 1 VNet, 1 Subnet, 1 NSG, 3 Free-Tier VMs:
#   VM-1: Standard_B1s   (1 vCPU, 1 GB RAM) — x86_64
#   VM-2: Standard_B2pts_v2 (2 vCPU, 1 GB RAM) — ARM64
#   VM-3: Standard_B2ats_v2 (2 vCPU, 1 GB RAM) — AMD x86_64

terraform {
  required_version = ">= 1.5"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.80"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}

# ── Variables ─────────────────────────────────────────────────────────────────

variable "subscription_id" {
  description = "Azure Subscription ID"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "eastus"
}

variable "ssh_public_key_path" {
  description = "Path to SSH public key"
  type        = string
  default     = "~/.ssh/socialplug_key.pub"
}

variable "firebase_bucket" {
  description = "Firebase Storage bucket"
  type        = string
  default     = "livepay-petition.firebasestorage.app"
}

# ── VM Definitions ────────────────────────────────────────────────────────────

locals {
  vms = {
    "socialplug-vm-1" = {
      vm_id    = "VM-1"
      size     = "Standard_B2pts_v2"
      zone     = null
      image    = { publisher = "Canonical", offer = "0001-com-ubuntu-server-jammy", sku = "22_04-lts-arm64", version = "latest" }
    }
    "socialplug-vm-2" = {
      vm_id    = "VM-2"
      size     = "Standard_B2ats_v2"
      zone     = null
      image    = { publisher = "Canonical", offer = "0001-com-ubuntu-server-jammy", sku = "22_04-lts-gen2", version = "latest" }
    }
  }
}

# ── Resource Group ────────────────────────────────────────────────────────────

resource "azurerm_resource_group" "rg" {
  name     = "socialplug-rg"
  location = var.location
}

# ── Networking ────────────────────────────────────────────────────────────────

resource "azurerm_virtual_network" "vnet" {
  name                = "socialplug-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
}

resource "azurerm_subnet" "subnet" {
  name                 = "socialplug-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.1.0/24"]
}

resource "azurerm_network_security_group" "nsg" {
  name                = "socialplug-nsg"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  security_rule {
    name                       = "SSH"
    priority                   = 1001
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "HTTPS"
    priority                   = 1002
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_subnet_network_security_group_association" "nsg_assoc" {
  subnet_id                 = azurerm_subnet.subnet.id
  network_security_group_id = azurerm_network_security_group.nsg.id
}

# ── Public IPs ────────────────────────────────────────────────────────────────

resource "azurerm_public_ip" "pip" {
  for_each            = local.vms
  name                = "${each.key}-pip"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  allocation_method   = "Static"
  sku                 = "Standard"
}

# ── NICs ──────────────────────────────────────────────────────────────────────

resource "azurerm_network_interface" "nic" {
  for_each            = local.vms
  name                = "${each.key}-nic"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.subnet.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.pip[each.key].id
  }
}

# ── Virtual Machines ──────────────────────────────────────────────────────────

resource "azurerm_linux_virtual_machine" "vm" {
  for_each            = local.vms
  name                = each.key
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  size                = each.value.size

  admin_username = "azureuser"
  admin_ssh_key {
    username   = "azureuser"
    public_key = file(var.ssh_public_key_path)
  }

  network_interface_ids = [azurerm_network_interface.nic[each.key].id]

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
    disk_size_gb         = 30
  }

  source_image_reference {
    publisher = each.value.image.publisher
    offer     = each.value.image.offer
    sku       = each.value.image.sku
    version   = each.value.image.version
  }

  custom_data = base64encode(templatefile("${path.module}/cloud-init.yaml", {
    vm_id           = each.value.vm_id
    firebase_bucket = var.firebase_bucket
  }))

  tags = {
    project = "socialplug"
    vm_id   = each.value.vm_id
  }
}

# ── Outputs ───────────────────────────────────────────────────────────────────

output "vm_public_ips" {
  description = "Public IPs of all SocialPlug VMs"
  value       = { for k, vm in azurerm_linux_virtual_machine.vm : k => azurerm_public_ip.pip[k].ip_address }
}

output "ssh_commands" {
  description = "SSH commands to connect to each VM"
  value       = { for k, vm in azurerm_linux_virtual_machine.vm : k => "ssh -i ${var.ssh_public_key_path} azureuser@${azurerm_public_ip.pip[k].ip_address}" }
}
