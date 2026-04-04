# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  SocialPlug — Terraform Configuration for Oracle Cloud Always Free VMs     ║
# ║  by Illy Robotic Instruments                                               ║
# ╚══════════════════════════════════════════════════════════════════════════════╝
#
# Creates: 1 VCN, 1 public subnet, 1 internet gateway, 1 security list,
#          4 ARM Ampere A1 instances (1 OCPU / 6 GB each) with cloud-init.

terraform {
  required_version = ">= 1.5"
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = ">= 5.0"
    }
  }
}

# ── Provider ──────────────────────────────────────────────────────────────────

provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = var.private_key_path
  region           = var.region
}

# ── Variables ─────────────────────────────────────────────────────────────────

variable "tenancy_ocid" {
  description = "OCID of your OCI tenancy"
  type        = string
}

variable "user_ocid" {
  description = "OCID of the OCI user"
  type        = string
}

variable "fingerprint" {
  description = "Fingerprint of the API signing key"
  type        = string
}

variable "private_key_path" {
  description = "Path to the OCI API private key PEM file"
  type        = string
  default     = "~/.oci/oci_api_key.pem"
}

variable "region" {
  description = "OCI region (use your home region for Always Free)"
  type        = string
  default     = "us-ashburn-1"
}

variable "compartment_ocid" {
  description = "OCID of the compartment to create resources in"
  type        = string
}

variable "ssh_public_key_path" {
  description = "Path to SSH public key for VM access"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

variable "vm_count" {
  description = "Number of VMs to create (max 4 for Always Free)"
  type        = number
  default     = 4
}

variable "firebase_bucket" {
  description = "Firebase Storage bucket for screenshots"
  type        = string
  default     = "livepay-petition.firebasestorage.app"
}

# ── Data Sources ──────────────────────────────────────────────────────────────

data "oci_identity_availability_domains" "ads" {
  compartment_id = var.tenancy_ocid
}

# Get the latest Ubuntu 22.04 aarch64 image
data "oci_core_images" "ubuntu_arm" {
  compartment_id           = var.compartment_ocid
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "22.04"
  shape                    = "VM.Standard.A1.Flex"
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

# ── Networking ────────────────────────────────────────────────────────────────

resource "oci_core_vcn" "socialplug_vcn" {
  compartment_id = var.compartment_ocid
  display_name   = "socialplug-vcn"
  cidr_blocks    = ["10.0.0.0/16"]
}

resource "oci_core_internet_gateway" "igw" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.socialplug_vcn.id
  display_name   = "socialplug-igw"
  enabled        = true
}

resource "oci_core_route_table" "public_rt" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.socialplug_vcn.id
  display_name   = "socialplug-public-rt"

  route_rules {
    destination       = "0.0.0.0/0"
    network_entity_id = oci_core_internet_gateway.igw.id
  }
}

resource "oci_core_security_list" "public_sl" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.socialplug_vcn.id
  display_name   = "socialplug-public-sl"

  # Allow all egress
  egress_security_rules {
    protocol    = "all"
    destination = "0.0.0.0/0"
    stateless   = false
  }

  # SSH
  ingress_security_rules {
    protocol  = "6" # TCP
    source    = "0.0.0.0/0"
    stateless = false
    tcp_options {
      min = 22
      max = 22
    }
  }

  # HTTPS (for agent callbacks)
  ingress_security_rules {
    protocol  = "6"
    source    = "0.0.0.0/0"
    stateless = false
    tcp_options {
      min = 443
      max = 443
    }
  }

  # ICMP (ping — helps avoid idle reclamation detection)
  ingress_security_rules {
    protocol  = "1" # ICMP
    source    = "0.0.0.0/0"
    stateless = false
  }
}

resource "oci_core_subnet" "public_subnet" {
  compartment_id    = var.compartment_ocid
  vcn_id            = oci_core_vcn.socialplug_vcn.id
  display_name      = "socialplug-public-subnet"
  cidr_block        = "10.0.0.0/24"
  route_table_id    = oci_core_route_table.public_rt.id
  security_list_ids = [oci_core_security_list.public_sl.id]
}

# ── Compute Instances ─────────────────────────────────────────────────────────

resource "oci_core_instance" "socialplug_vm" {
  count               = var.vm_count
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  compartment_id      = var.compartment_ocid
  display_name        = "socialplug-vm-${count.index + 1}"

  shape = "VM.Standard.A1.Flex"
  shape_config {
    ocpus         = 1
    memory_in_gbs = 6
  }

  source_details {
    source_id   = data.oci_core_images.ubuntu_arm.images[0].id
    source_type = "image"
    boot_volume_size_in_gbs = 47
  }

  create_vnic_details {
    assign_public_ip = true
    subnet_id        = oci_core_subnet.public_subnet.id
    display_name     = "socialplug-vnic-${count.index + 1}"
  }

  metadata = {
    ssh_authorized_keys = file(var.ssh_public_key_path)
    user_data           = base64encode(templatefile("${path.module}/cloud-init.yaml", {
      vm_id          = "VM-${count.index + 1}"
      firebase_bucket = var.firebase_bucket
    }))
  }

  preserve_boot_volume = false

  lifecycle {
    ignore_changes = [source_details[0].source_id]
  }
}

# ── Outputs ───────────────────────────────────────────────────────────────────

output "vm_public_ips" {
  description = "Public IPs of all SocialPlug VMs"
  value       = { for i, vm in oci_core_instance.socialplug_vm : vm.display_name => vm.public_ip }
}

output "vm_ids" {
  description = "OCIDs of all SocialPlug VMs"
  value       = { for i, vm in oci_core_instance.socialplug_vm : vm.display_name => vm.id }
}

output "ssh_commands" {
  description = "SSH commands to connect to each VM"
  value       = { for i, vm in oci_core_instance.socialplug_vm : vm.display_name => "ssh -i ${var.ssh_public_key_path} ubuntu@${vm.public_ip}" }
}
