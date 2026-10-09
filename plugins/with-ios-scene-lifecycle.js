// iOS 27 encerra o app na abertura (EXC_BREAKPOINT em
// UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption) se ele não
// adotar o ciclo de vida por scenes. O Expo SDK 57 já traz a peça pronta
// (ExpoAppSceneDelegate, classe ObjC "EXExpoAppSceneDelegate"), mas o template
// do prebuild ainda gera o modelo antigo. Este plugin liga as duas pontas e
// sobrevive a qualquer `expo prebuild`, já que a pasta ios/ é gerada:
//   1. Info.plist: UIApplicationSceneManifest apontando para a scene delegate.
//   2. AppDelegate.swift: passa a ser ExpoReactNativeFactoryProvider e deixa de
//      criar a janela / iniciar o React Native (quem faz isso agora é a scene).
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const SCENE_DELEGATE_CLASS = 'EXExpoAppSceneDelegate';

function patchAppDelegate(contents) {
  let out = contents;

  if (!/ExpoReactNativeFactoryProvider/.test(out)) {
    out = out.replace(
      /class AppDelegate: ExpoAppDelegate \{/,
      'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
    );
  }

  // Remove a criação da janela e o startReactNative do didFinishLaunching.
  const legacyStart =
    /#if os\(iOS\) \|\| os\(tvOS\)\s*\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*\n\s*factory\.startReactNative\(\s*\n\s*withModuleName: "main",\s*\n\s*in: window,\s*\n\s*launchOptions: launchOptions\)\s*\n#endif\s*\n/;
  if (legacyStart.test(out)) {
    out = out.replace(
      legacyStart,
      '    // O UIWindow e o startReactNative agora ficam na scene delegate\n' +
        '    // (ExpoAppSceneDelegate), exigência do iOS 27.\n',
    );
  }
  return out;
}

module.exports = function withIosSceneLifecycle(config) {
  config = withInfoPlist(config, (c) => {
    c.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: SCENE_DELEGATE_CLASS,
          },
        ],
      },
    };
    return c;
  });

  config = withAppDelegate(config, (c) => {
    if (c.modResults.language !== 'swift') {
      throw new Error('with-ios-scene-lifecycle: só AppDelegate em Swift é suportado.');
    }
    c.modResults.contents = patchAppDelegate(c.modResults.contents);
    return c;
  });

  return config;
};
