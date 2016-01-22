require "bundler/setup"
require 'json'
require "sinatra"
require "logger"
require "cloudinary"


get '/' do
  cache_control :public, max_age: 3600
  File.read(File.join('public', 'index.html'))
end

get '/tos' do
  cache_control :public, max_age: 25200
  File.read(File.join('public', 'tos.html'))
end

post "/authenticate" do  
  content_type :json 
  aspect_ratios = params[:aspect_ratios].to_s.split(",")
  aspect_ratios = ["original"] if aspect_ratios.blank?
  breakpoints_settings = []
  retina = params[:retina].to_s == '1'
  aspect_ratios.each do |aspect_ratio|
    settings = params[:breakpoints_settings].clone || {}    
    settings[:create_derived] = true
    settings.each do |k, v| 
      if v && v.is_a?(String) && v.match(/^\d+$/)
        settings[k] = v.to_i
      end
    end
    settings["max_width"] = settings["max_width"]*2 if retina
    settings[:transformation] = {:crop => :fill, :aspect_ratio => aspect_ratio} if aspect_ratio != 'original'
    breakpoints_settings << settings
  end
  explicit_params = Cloudinary::Uploader.build_explicit_api_params(params[:public_id], type: :upload, responsive_breakpoints: breakpoints_settings)
  explicit_params.reject!{|k, v| v.nil? || v=="" }

  {
    url: Cloudinary::Utils.cloudinary_api_url("explicit"),
    params: Cloudinary::Utils.sign_request(explicit_params)
  }.to_json
end

post "/zip_url" do
  breakpoints = JSON.parse(params[:breakpoints])
  transformations = []
  breakpoints.each do |breakpoints_info|
    breakpoints_info["breakpoints"].each do |breakpoint|
      if breakpoints_info["transformation"]
        transformations << {:transformation => [{:raw_transformation => breakpoints_info["transformation"]}, {crop: 'scale', width: breakpoint["width"]}]}
      else
        transformations << {crop: 'scale', width: breakpoint["width"]}
      end
    end
  end  
  content_type :json    
  {
    url: Cloudinary::Utils.download_zip_url(
      public_ids: [params[:public_id]],  
      flatten: true,     
      transformations: transformations)
  }.to_json
end
