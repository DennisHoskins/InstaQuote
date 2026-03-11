<?php
/**
 * Plugin Name: InstaQuote Integration
 * Description: API proxy and shortcode for InstaQuote app
 * Version: 1.0
 * Author: Dennis Hoskins
 */

// Prevent direct access
if (!defined('ABSPATH')) exit;

add_action('init', function() {
    if (strpos($_SERVER['REQUEST_URI'], '/wp-json/') !== false) {
        error_log('=== INSTAQUOTE INIT DEBUG ===');
        error_log('REQUEST_URI: ' . $_SERVER['REQUEST_URI']);
        error_log('is_user_logged_in: ' . (is_user_logged_in() ? 'YES' : 'NO'));
        error_log('current_user_id: ' . get_current_user_id());
        error_log('cookies: ' . (empty($_COOKIE) ? 'NONE' : implode(', ', array_keys($_COOKIE))));
    }
}, 1);

// API Proxy
add_action('rest_api_init', function () {
    register_rest_route('instaquote/v1', '/nonce', array(
        'methods' => 'GET',
        'callback' => function() {
            return new WP_REST_Response(array(
                'nonce' => wp_create_nonce('wp_rest')
            ), 200);
        },
        'permission_callback' => '__return_true'
    ));

    register_rest_route('instaquote/v1', '/me', array(
        'methods' => 'GET',
        'callback' => function() {
            if (!is_user_logged_in()) {
                return new WP_REST_Response(array('error' => 'Not authenticated'), 401);
            }
            
            $current_user = wp_get_current_user();
            return new WP_REST_Response(array(
                'id' => $current_user->ID,
                'username' => $current_user->user_login,
                'email' => $current_user->user_email,
                'roles' => $current_user->roles,
            ), 200);
        },
        'permission_callback' => '__return_true'
    ));

    register_rest_route('instaquote/v1', '/proxy/(?P<path>.*)', array(
        'methods' => 'GET,POST,PUT,DELETE,PATCH',
        'callback' => 'instaquote_proxy_request',
        'permission_callback' => '__return_true'
    ));
});

function instaquote_proxy_request($request) {
    if (!is_user_logged_in()) {
        return new WP_REST_Response(
            array('error' => 'Authentication required'),
            401
        );
    }
    
    $path = $request->get_param('path');
    $method = $request->get_method();
    
    $droplet_url = 'https://dennishoskins.com/instaquote/api/' . $path;

    // Build user data
    $current_user = wp_get_current_user();
    $user_data = array(
        'id' => $current_user->ID,
        'username' => $current_user->user_login,
        'email' => $current_user->user_email,
        'display_name' => $current_user->display_name,
        'roles' => $current_user->roles,
    );
    $user_header = base64_encode(json_encode($user_data));    
    
    $args = array(
        'method' => $method,
        'timeout' => 30,
        'headers' => array(
            'Content-Type' => 'application/json',
            'X-InstaQuote-Key' => INSTAQUOTE_API_KEY,
            'X-InstaQuote-User' => $user_header,
        )
    );

    if (in_array($method, ['POST', 'PUT', 'PATCH'])) {
        $args['body'] = $request->get_body();
    }
    
    $query_params = $request->get_query_params();
    if (!empty($query_params)) {
        $droplet_url = add_query_arg($query_params, $droplet_url);
    }
    
    $response = wp_remote_request($droplet_url, $args);
    
    if (is_wp_error($response)) {
        return new WP_REST_Response(
            array('error' => $response->get_error_message()),
            500
        );
    }
    
    $body = wp_remote_retrieve_body($response);
    $status = wp_remote_retrieve_response_code($response);
    
    return new WP_REST_Response(json_decode($body), $status);
}

// Shortcode
function instaquote_app_shortcode() {
    $version = time();
    $plugin_url = plugin_dir_url(__FILE__);
    ob_start();
    ?>
    <style>
        .et_pb_section_0 {
            padding-top: 0 !important;
        }
        #instaquote-wrapper {
            min-height: 100vh;
        }        
    </style>
    <script>
        window.instaquoteNonce = "<?php echo wp_create_nonce('wp_rest'); ?>";
    </script>
    <div id="instaquote-wrapper">
        <div id="root"></div>
    </div>
    <script type="module" src="<?php echo $plugin_url; ?>index.js?v=<?php echo $version; ?>"></script>
    <?php
    return ob_get_clean();
}

add_shortcode('instaquote_app', 'instaquote_app_shortcode');
?>