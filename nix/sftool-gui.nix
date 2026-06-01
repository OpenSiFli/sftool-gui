{
  lib,
  stdenv,
  rustPlatform,
  cargo-tauri,
  glib-networking,
  nodejs,
  libgudev,
  systemd,
  pnpm,
  openssl,
  nix-update-script,
  pkg-config,
  webkitgtk_4_1,
  wrapGAppsHook4,
  autoPatchelfHook,
}:
rustPlatform.buildRustPackage rec {

  pname = "sftool-gui";
  version = (builtins.fromTOML (builtins.readFile ../src-tauri/Cargo.toml)).package.version;
  src = ../.;
  cargoLock = {

    outputHashes = {
      "sftool-lib-0.2.3" = "sha256-1vJmGgaLJq7ZDTg83vTdxLyWIddymyKsGkSP5Jscw0I=";
    };
    lockFile = ../src-tauri/Cargo.lock;
  };
  cargoRoot = "src-tauri";

  pnpmDeps = pnpm.fetchDeps {
    fetcherVersion = 1;
    inherit pname version src;
    hash = "sha256-n0gRm4xFA0iVUjo+5rIDZeyb2dh6xh4NY8gIDvU8Xjw=";
  };

  nativeBuildInputs = [
    cargo-tauri.hook
    pnpm.configHook
    nodejs
    pkg-config
    wrapGAppsHook4
    autoPatchelfHook
  ];

  buildInputs = [
    openssl
  ]
  ++ lib.optionals stdenv.hostPlatform.isLinux [
    glib-networking # Most Tauri apps need networking
    webkitgtk_4_1
    libgudev
    systemd
  ];

  # Set our Tauri source directory
  # And make sure we build there too
  buildAndTestSubdir = cargoRoot;

  passthru = {
    inherit pnpmDeps;
    updateScript = nix-update-script { };
  };
}
