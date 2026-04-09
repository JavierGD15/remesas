#!/usr/bin/env bash
# setup-vm.sh
# Script de inicializacion unica para una VM Ubuntu/Debian en GCP.
# Ejecutar con: bash setup-vm.sh
# No requiere sudo previo; el script lo invoca internamente donde es necesario.

set -euo pipefail

# ---------------------------------------------------------------------------
# 1. Actualizar el indice de paquetes y aplicar upgrades disponibles
# ---------------------------------------------------------------------------
echo ">>> Actualizando paquetes del sistema..."
sudo apt-get update -y
sudo apt-get upgrade -y

# ---------------------------------------------------------------------------
# 2. Instalar dependencias base
#    - ca-certificates / gnupg: necesarios para verificar la clave GPG de Docker
#    - curl: descarga de claves y scripts
#    - git: clonar el repositorio del proyecto
#    - lsb-release: detectar la version/codename de la distribucion
# ---------------------------------------------------------------------------
echo ">>> Instalando dependencias base..."
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    git \
    lsb-release

# ---------------------------------------------------------------------------
# 3. Agregar la clave GPG oficial de Docker
#    Se guarda en /etc/apt/keyrings/ segun la practica recomendada actual.
# ---------------------------------------------------------------------------
echo ">>> Agregando clave GPG de Docker..."
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# ---------------------------------------------------------------------------
# 4. Registrar el repositorio oficial de Docker en apt sources
#    Se usa el codename de la distro (ej. jammy, focal, bookworm) para
#    apuntar al canal "stable" correcto.
# ---------------------------------------------------------------------------
echo ">>> Agregando repositorio de Docker..."
echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# ---------------------------------------------------------------------------
# 5. Instalar Docker Engine y Docker Compose V2
#    - docker-ce:              motor principal
#    - docker-ce-cli:          cliente de linea de comandos
#    - containerd.io:          runtime de contenedores
#    - docker-buildx-plugin:   soporte para builds multi-plataforma
#    - docker-compose-plugin:  Compose V2 (comando: docker compose)
# ---------------------------------------------------------------------------
echo ">>> Instalando Docker Engine y Docker Compose V2..."
sudo apt-get update -y
sudo apt-get install -y \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin

# ---------------------------------------------------------------------------
# 6. Agregar el usuario actual al grupo "docker"
#    Permite ejecutar "docker" y "docker compose" sin sudo.
#    El cambio de grupo toma efecto en la siguiente sesion SSH o al ejecutar
#    "newgrp docker" en la sesion actual.
# ---------------------------------------------------------------------------
echo ">>> Agregando $USER al grupo docker..."
sudo usermod -aG docker "$USER"

# ---------------------------------------------------------------------------
# 7. Habilitar Docker para que inicie automaticamente con el sistema
# ---------------------------------------------------------------------------
echo ">>> Habilitando Docker en el arranque del sistema..."
sudo systemctl enable docker
sudo systemctl enable containerd

# ---------------------------------------------------------------------------
# 8. Verificacion
# ---------------------------------------------------------------------------
echo ""
echo ">>> Instalacion completada."
echo "    Docker version:         $(sudo docker --version)"
echo "    Docker Compose version: $(sudo docker compose version)"
echo ""
echo "    IMPORTANTE: cierra y vuelve a abrir la sesion SSH (o ejecuta"
echo "    'newgrp docker') para que el grupo docker tome efecto sin sudo."
